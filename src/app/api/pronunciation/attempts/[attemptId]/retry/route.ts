import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { processPronunciationAttempt } from "../../../../../../modules/pronunciation-practice/processor";
import {
  failPronunciationAttempt,
  retryPronunciationAttempt,
} from "../../../../../../modules/pronunciation-practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
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

  const { attemptId } = await params;
  if (!UUID_PATTERN.test(attemptId)) {
    return NextResponse.json({ error: "Lần luyện phát âm chưa hợp lệ." }, { status: 400 });
  }

  let attempt;
  try {
    attempt = await retryPronunciationAttempt(attemptId, principal.userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Pronunciation attempt not found.") {
      return NextResponse.json({ error: "Không tìm thấy lần luyện phát âm." }, { status: 404 });
    }
    if (message.includes("not retryable") || message.includes("already claimed")) {
      return NextResponse.json({ error: "Lần luyện này chưa thể thử lại." }, { status: 409 });
    }
    console.error("Pronunciation retry claim failed");
    return NextResponse.json({ error: "Không thể thử lại lần luyện phát âm." }, { status: 500 });
  }

  const { data, error: downloadError } = await getSupabaseAdminClient()
    .storage
    .from(attempt.storageBucket)
    .download(attempt.storagePath);
  if (downloadError || !data) {
    await failPronunciationAttempt(
      attemptId,
      principal.userId,
      "AUDIO_DOWNLOAD_ERROR",
      "Không thể tải bản ghi âm đã lưu. Vui lòng thử lại.",
    ).catch(() => null);
    return NextResponse.json({
      attemptId,
      status: "FAILED",
      error: "Không thể tải bản ghi âm đã lưu. Vui lòng thử lại.",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const audio = data.type === attempt.mimeType
      ? data
      : new Blob([data], { type: attempt.mimeType });
    const outcome = await processPronunciationAttempt(attempt, principal.userId, audio);
    if (!outcome.ok) {
      return NextResponse.json(
        { attemptId: outcome.attemptId, status: outcome.status, error: outcome.error },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Pronunciation retry processing failed");
    return NextResponse.json({
      attemptId,
      error: "Không thể xử lý lại lần luyện phát âm.",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
