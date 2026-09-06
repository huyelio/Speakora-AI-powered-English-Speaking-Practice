import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server";
import { validateAudio } from "../../../../../../modules/audio/validation";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import {
  authorizeSession,
  findRegisteredAnswer,
  getClientPracticeSession,
  questionBelongsToSession,
  recordAnswerProgress,
  registerPracticeAnswer,
  type PracticeAnswerRegistration,
} from "../../../../../../modules/practice/repository";

export const runtime = "nodejs";

class AnswerCleanupError extends Error {}
class AnswerRegistrationUncertainError extends Error {}

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;
type RegistrationResult = Awaited<ReturnType<typeof registerPracticeAnswer>>;
type RegisteredAnswer = Awaited<ReturnType<typeof findRegisteredAnswer>>;

async function removeUnusedAnswerUpload(db: AdminClient, path: string): Promise<void> {
  const { error } = await db.storage.from("speaking-answers").remove([path]);
  if (error) throw new AnswerCleanupError("Unable to clean up unused answer upload.");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }
    const session = await authorizeSession(sessionId, principal);
    if (!session) {
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

    let registered: RegistrationResult;
    try {
      registered = await registerPracticeAnswer(registrationInput);
    } catch (registrationError) {
      let reconciled: RegisteredAnswer;
      try {
        reconciled = await findRegisteredAnswer(sessionQuestionId);
      } catch {
        // The registration may have committed. Retain its upload when durable
        // state cannot be reconciled instead of risking data loss.
        throw new AnswerRegistrationUncertainError();
      }

      if (!reconciled) {
        // A transport failure can become visible before its transaction does.
        // Null is inconclusive, so retain the object for an idempotent retry.
        throw new AnswerRegistrationUncertainError();
      }

      if (reconciled.idempotencyKey !== idempotencyKey) {
        // A different durable answer for this unique session question proves
        // that this upload cannot be referenced by a later commit.
        if (newlyUploadedPath) {
          await removeUnusedAnswerUpload(db, newlyUploadedPath);
          newlyUploadedPath = null;
        }
        throw registrationError;
      }

      registered = {
        answerId: reconciled.id,
        status: reconciled.status,
        sequenceNo: question.sequence_no,
      };
      if (newlyUploadedPath && reconciled.storagePath !== newlyUploadedPath) {
        await removeUnusedAnswerUpload(db, newlyUploadedPath);
        newlyUploadedPath = null;
      } else if (newlyUploadedPath) {
        // The committed answer durably references this object.
        newlyUploadedPath = null;
      }
    }

    if (newlyUploadedPath && registered.answerId !== registrationInput.answerId) {
      await removeUnusedAnswerUpload(db, newlyUploadedPath);
    }

    await recordAnswerProgress(registered.answerId);
    const durableSession = await getClientPracticeSession(session);
    return NextResponse.json(
      {
        answerId: registered.answerId,
        status: registered.status,
        nextQuestionIndex: durableSession.currentQuestionIndex,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof AnswerRegistrationUncertainError) {
      console.error("Answer registration remains unconfirmed");
      return NextResponse.json(
        { error: "Answer registration is still being confirmed. Retry the same answer." },
        { status: 500 },
      );
    }
    if (error instanceof AnswerCleanupError) {
      console.error("Answer upload cleanup failed");
      return NextResponse.json(
        { error: "Unable to clean up unused answer upload." },
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unable to upload answer.";
    console.error("Answer upload failed", message);
    const status = /Audio|audio|format|25 MB/.test(message) ? 400 : 500;
    return NextResponse.json(
      { error: status === 400 ? message : "Unable to upload answer." },
      { status },
    );
  }
}
