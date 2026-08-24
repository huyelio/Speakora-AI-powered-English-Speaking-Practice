import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server";
import { validateAudio } from "../../../../../../modules/audio/validation";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import {
  authorizeSession,
  findRegisteredAnswer,
  questionBelongsToSession,
  recordAnswerProgress,
  registerPracticeAnswer,
  type PracticeAnswerRegistration,
} from "../../../../../../modules/practice/repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal || !await authorizeSession(sessionId, principal)) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const form = await request.formData();
    const audio = form.get("audio");
    const sessionQuestionId = String(form.get("sessionQuestionId") || "");
    const idempotencyKey = String(form.get("idempotencyKey") || "");
    const durationMs = Number(form.get("durationMs"));
    if (!(audio instanceof File) || !sessionQuestionId || !idempotencyKey || !Number.isInteger(durationMs) || durationMs < 0) {
      return NextResponse.json({ error: "Invalid answer payload." }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(idempotencyKey)) {
      return NextResponse.json({ error: "Invalid idempotency key." }, { status: 400 });
    }

    const extension = validateAudio(audio);
    const question = await questionBelongsToSession(sessionId, sessionQuestionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found in session." }, { status: 404 });
    }

    const existing = await findRegisteredAnswer(sessionQuestionId);
    if (existing && existing.idempotencyKey !== idempotencyKey) {
      return NextResponse.json({ error: "Question already has an answer." }, { status: 409 });
    }

    const db = getSupabaseAdminClient();
    let registrationInput: PracticeAnswerRegistration;
    let newlyUploadedPath: string | null = null;

    if (existing) {
      registrationInput = {
        answerId: existing.id,
        sessionId,
        sessionQuestionId,
        storagePath: existing.storagePath,
        mimeType: existing.mimeType,
        durationMs: existing.durationMs,
        sizeBytes: existing.sizeBytes,
        idempotencyKey,
      };
    } else {
      const answerId = randomUUID();
      const path = `sessions/${sessionId}/answers/${answerId}.${extension}`;
      const { error: uploadError } = await db.storage
        .from("speaking-answers")
        .upload(path, audio, { contentType: audio.type, upsert: false });
      if (uploadError) throw uploadError;
      newlyUploadedPath = path;
      registrationInput = {
        answerId,
        sessionId,
        sessionQuestionId,
        storagePath: path,
        mimeType: audio.type,
        durationMs,
        sizeBytes: audio.size,
        idempotencyKey,
      };
    }

    let registered;
    try {
      registered = await registerPracticeAnswer(registrationInput);
    } catch (error) {
      if (newlyUploadedPath) {
        await db.storage.from("speaking-answers").remove([newlyUploadedPath]);
      }
      throw error;
    }

    if (newlyUploadedPath && registered.answerId !== registrationInput.answerId) {
      await db.storage.from("speaking-answers").remove([newlyUploadedPath]);
    }

    await recordAnswerProgress(registered.answerId);
    return NextResponse.json(
      {
        answerId: registered.answerId,
        status: registered.status,
        nextQuestionIndex: registered.sequenceNo,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload answer.";
    console.error("Answer upload failed", message);
    const status = /Audio|audio|format|25 MB/.test(message) ? 400 : 500;
    return NextResponse.json(
      { error: status === 400 ? message : "Unable to upload answer." },
      { status },
    );
  }
}
