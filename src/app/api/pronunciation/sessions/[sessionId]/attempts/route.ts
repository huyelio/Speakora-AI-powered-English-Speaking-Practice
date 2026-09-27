import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server";
import { validateAudio } from "../../../../../../modules/audio/validation";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { processPronunciationAttempt } from "../../../../../../modules/pronunciation-practice/processor";
import {
  claimPronunciationAttemptProcessing,
  findPronunciationAttemptByIdempotency,
  getPronunciationSessionItemSnapshot,
  registerPronunciationAttempt,
} from "../../../../../../modules/pronunciation-practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRONUNCIATION_MAX_AUDIO_BYTES = 10 * 1024 * 1024;

class UploadFailedError extends Error {}
class RegistrationUncertainError extends Error {}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  let principal: Awaited<ReturnType<typeof resolveSessionPrincipal>>;
  try {
    principal = await resolveSessionPrincipal(request);
  } catch {
    return NextResponse.json({ error: "Không thể xác minh phiên đăng nhập." }, { status: 500 });
  }
  if (!principal || principal.kind !== "user") {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: "Phiên luyện phát âm chưa hợp lệ." }, { status: 400 });
    }
    const form = await request.formData();
    const audio = form.get("audio");
    const sessionItemId = String(form.get("sessionItemId") || "");
    const idempotencyKey = String(form.get("idempotencyKey") || "");
    const durationMs = Number(form.get("durationMs"));
    if (!(audio instanceof File)
      || !UUID_PATTERN.test(sessionItemId)
      || !UUID_PATTERN.test(idempotencyKey)
      || !Number.isInteger(durationMs)
      || durationMs < 0) {
      return NextResponse.json({ error: "Thông tin lần luyện phát âm chưa hợp lệ." }, { status: 400 });
    }

    let extension: string;
    try {
      extension = validateAudio(audio, {
        maxBytes: PRONUNCIATION_MAX_AUDIO_BYTES,
        maxSizeLabel: "10 MiB",
      });
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : "Bản ghi âm chưa hợp lệ.",
      }, { status: 400 });
    }

    const snapshot = await getPronunciationSessionItemSnapshot(sessionId, principal.userId, sessionItemId);
    if (!snapshot) {
      return NextResponse.json({ error: "Không tìm thấy mục luyện phát âm trong phiên." }, { status: 404 });
    }

    const existing = await findPronunciationAttemptByIdempotency(
      sessionItemId,
      idempotencyKey,
      principal.userId,
    );
    if (existing) {
      return NextResponse.json(
        { attemptId: existing.attemptId, status: existing.status },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const db = getSupabaseAdminClient();
    const attemptId = randomUUID();
    const storagePath = `users/${principal.userId}/pronunciation/sessions/${sessionId}/attempts/${attemptId}.${extension}`;
    const { error: uploadError } = await db.storage
      .from("speaking-answers")
      .upload(storagePath, audio, { contentType: audio.type, upsert: false });
    if (uploadError) throw new UploadFailedError();

    let registered;
    try {
      registered = await registerPronunciationAttempt({
        attemptId,
        userId: principal.userId,
        sessionItemId,
        storagePath,
        mimeType: audio.type,
        durationMs,
        sizeBytes: audio.size,
        idempotencyKey,
      });
    } catch {
      const reconciled = await findPronunciationAttemptByIdempotency(
        sessionItemId,
        idempotencyKey,
        principal.userId,
      ).catch(() => null);
      if (!reconciled) {
        // A lost RPC response may have committed, so retain the only possible
        // durable object and let the exact idempotent request reconcile later.
        throw new RegistrationUncertainError();
      }
      if (reconciled.storagePath !== storagePath) {
        await removeNewUpload(db, storagePath);
        return NextResponse.json(
          { attemptId: reconciled.attemptId, status: reconciled.status },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        );
      }
      registered = { attemptId: reconciled.attemptId, status: reconciled.status };
    }

    if (registered.attemptId !== attemptId) {
      await removeNewUpload(db, storagePath);
      return NextResponse.json(
        { attemptId: registered.attemptId, status: registered.status },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const claimed = await claimPronunciationAttemptProcessing(attemptId, principal.userId);
    if (!claimed) {
      const authoritative = await findPronunciationAttemptByIdempotency(
        sessionItemId,
        idempotencyKey,
        principal.userId,
      );
      return NextResponse.json({
        attemptId: authoritative?.attemptId ?? attemptId,
        status: authoritative?.status ?? registered.status,
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const outcome = await processPronunciationAttempt(claimed, principal.userId, audio);
    if (!outcome.ok) {
      return NextResponse.json(
        { attemptId: outcome.attemptId, status: outcome.status, error: outcome.error },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(outcome, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RegistrationUncertainError) {
      return NextResponse.json(
        { error: "Lần luyện đang được xác nhận. Hãy gửi lại đúng bản ghi với cùng mã gửi." },
        { status: 500 },
      );
    }
    if (error instanceof UploadFailedError) {
      return NextResponse.json({ error: "Không thể tải bản ghi âm lên." }, { status: 500 });
    }
    console.error("Pronunciation attempt failed");
    return NextResponse.json({ error: "Không thể xử lý lần luyện phát âm." }, { status: 500 });
  }
}

async function removeNewUpload(
  db: ReturnType<typeof getSupabaseAdminClient>,
  storagePath: string,
) {
  const { error } = await db.storage.from("speaking-answers").remove([storagePath]);
  if (error) throw new Error("Pronunciation upload cleanup failed.");
}
