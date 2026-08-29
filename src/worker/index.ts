import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "../lib/supabase/config";
import { OpenAIProvider } from "../modules/ai-gateway/openai";
import type { PracticeMode } from "../modules/practice/types";
import {
  createJobFailureHandler,
  createJobProcessors,
  type AssessmentRecord,
  type JobFailureRecord,
  type ProcessingJob,
  type TranscriptPair,
  type WorkerDatabase,
  type WorkerFailureDatabase,
} from "./processors";

const { url, secretKey } = getSupabaseConfiguration();
const db = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const provider = new OpenAIProvider();
const workerId = `worker-${randomUUID()}`;
const pollMs = Number(process.env.WORKER_POLL_MS || 1500);
let stopping = false;

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

type SessionQuestionTranscriptRow = {
  sequence_no: number;
  prompt_snapshot: { prompt_text?: unknown };
  user_answers: Array<{ transcripts: Array<{ text: unknown }> | { text: unknown } }> | {
    transcripts: Array<{ text: unknown }> | { text: unknown };
  };
};

function requireNoError(error: { message?: string } | null): void {
  if (error) throw error;
}

function requireData<T>(data: T | null, error: { message?: string } | null): T {
  requireNoError(error);
  if (data === null) throw new Error("Supabase returned no data.");
  return data;
}

function parseMode(value: unknown): PracticeMode {
  if (value !== "IELTS" && value !== "GENERAL") throw new Error("Practice session has an unsupported mode.");
  return value;
}

function transcriptPair(row: SessionQuestionTranscriptRow): TranscriptPair {
  const answer = Array.isArray(row.user_answers) ? row.user_answers[0] : row.user_answers;
  const transcript = answer && (Array.isArray(answer.transcripts) ? answer.transcripts[0] : answer.transcripts);
  const question = row.prompt_snapshot?.prompt_text;
  if (typeof question !== "string" || typeof transcript?.text !== "string") {
    throw new Error("Session contains an invalid question or transcript.");
  }
  return { question, sequence: row.sequence_no, transcript: transcript.text };
}

async function claim(): Promise<ProcessingJob | null> {
  const { data, error } = await db.rpc("claim_processing_job", { p_worker_id: workerId });
  requireNoError(error);
  return (data?.[0] || null) as ProcessingJob | null;
}

async function succeed(id: string): Promise<void> {
  const { error } = await db
    .from("processing_jobs")
    .update({
      status: "SUCCEEDED",
      locked_at: null,
      locked_by: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  requireNoError(error);
}

const workerDatabase: WorkerDatabase = {
  async getAnswer(answerId) {
    const { data, error } = await db
      .from("user_answers")
      .select("id,storage_bucket,storage_path,mime_type")
      .eq("id", answerId)
      .single();
    const answer = requireData(data, error);
    return {
      id: answer.id,
      storageBucket: answer.storage_bucket,
      storagePath: answer.storage_path,
      mimeType: answer.mime_type,
    };
  },
  async markAnswerTranscribing(answerId) {
    const { error } = await db
      .from("user_answers")
      .update({ status: "TRANSCRIBING", error_message: null })
      .eq("id", answerId);
    requireNoError(error);
  },
  async downloadAudio(bucket, path) {
    const { data, error } = await db.storage.from(bucket).download(path);
    return requireData(data, error);
  },
  async saveTranscript(input) {
    const { error } = await db.from("transcripts").upsert({
      answer_id: input.answerId,
      text: input.text,
      provider: input.provider,
      model: input.model,
      provider_metadata: {},
    }, { onConflict: "answer_id" });
    requireNoError(error);
  },
  async markAnswerTranscribed(answerId) {
    const { error } = await db
      .from("user_answers")
      .update({ status: "TRANSCRIBED", error_message: null })
      .eq("id", answerId);
    requireNoError(error);
  },
  async countTranscribedAnswers(sessionId) {
    const { count, error } = await db
      .from("user_answers")
      .select("id,session_questions!inner(session_id)", { count: "exact", head: true })
      .eq("session_questions.session_id", sessionId)
      .eq("status", "TRANSCRIBED");
    requireNoError(error);
    return count ?? 0;
  },
  async enqueueAssessment(sessionId) {
    const { error } = await db
      .from("processing_jobs")
      .insert({ session_id: sessionId, answer_id: null, job_type: "ASSESSMENT" });
    if (error && error.code !== "23505") throw error;
  },
  async markSessionProcessing(sessionId) {
    const { error } = await db.from("practice_sessions").update({ status: "PROCESSING" }).eq("id", sessionId);
    requireNoError(error);
  },
  markJobSucceeded: succeed,
  async getSessionMode(sessionId) {
    const { data, error } = await db.from("practice_sessions").select("mode").eq("id", sessionId).single();
    return parseMode(requireData(data, error).mode);
  },
  async getTranscriptPairs(sessionId) {
    const { data, error } = await db
      .from("session_questions")
      .select("sequence_no,prompt_snapshot,user_answers!inner(transcripts!inner(text))")
      .eq("session_id", sessionId)
      .order("sequence_no");
    return (requireData(data, error) as unknown as SessionQuestionTranscriptRow[]).map(transcriptPair);
  },
  async saveAssessment(record: AssessmentRecord) {
    const { error } = await db.from("session_assessments").upsert({
      session_id: record.sessionId,
      assessment_mode: record.assessmentMode,
      estimated_band: record.estimatedBand,
      overall_feedback: record.overallFeedback,
      strengths: record.strengths,
      improvements: record.improvements,
      next_steps: record.nextSteps,
      provider: record.provider,
      model: record.model,
      prompt_version: record.promptVersion,
      raw_output: record.rawOutput,
    }, { onConflict: "session_id" });
    requireNoError(error);
  },
  async markSessionCompleted(sessionId, completedAt) {
    const { error } = await db
      .from("practice_sessions")
      .update({ status: "COMPLETED", completed_at: completedAt })
      .eq("id", sessionId);
    requireNoError(error);
  },
  async completeSessionRewards(sessionId) {
    const { data, error } = await db.rpc("complete_session_rewards", { p_session_id: sessionId });
    requireNoError(error);
    const first = Array.isArray(data) ? data[0] : null;
    return { awardedXp: typeof first?.awarded_xp === "number" ? first.awarded_xp : 0 };
  },
};

const failureDatabase: WorkerFailureDatabase = {
  async isAssessmentPublished(sessionId) {
    const { data: session, error: sessionError } = await db
      .from("practice_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();
    const sessionStatus = requireData(session, sessionError).status;
    if (sessionStatus !== "COMPLETED") return false;

    const { count, error: assessmentError } = await db
      .from("session_assessments")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    requireNoError(assessmentError);
    return (count ?? 0) > 0;
  },
  markJobSucceeded: succeed,
  async markJobFailure(record: JobFailureRecord) {
    const { error } = await db
      .from("processing_jobs")
      .update({
        status: record.status,
        next_retry_at: record.nextRetryAt,
        locked_at: null,
        locked_by: null,
        error_message: record.errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.jobId);
    requireNoError(error);
  },
  async markAnswerFailed(answerId, errorMessage) {
    const { error } = await db
      .from("user_answers")
      .update({ status: "FAILED", error_message: errorMessage })
      .eq("id", answerId);
    requireNoError(error);
  },
  async markSessionFailed(sessionId) {
    const { error } = await db.from("practice_sessions").update({ status: "FAILED" }).eq("id", sessionId);
    requireNoError(error);
  },
};

const processors = createJobProcessors({ db: workerDatabase, provider });
const handleJobFailure = createJobFailureHandler({ db: failureDatabase });

async function main(): Promise<void> {
  console.log(`[worker] ${workerId} started`);
  while (!stopping) {
    try {
      const job = await claim();
      if (!job) {
        await new Promise((resolve) => setTimeout(resolve, pollMs));
        continue;
      }
      try {
        if (job.job_type === "STT") await processors.runStt(job);
        else await processors.runAssessment(job);
      } catch (error) {
        console.error(`[worker] job ${job.id} failed`, error);
        await handleJobFailure(job, error);
      }
    } catch (error) {
      console.error("[worker] polling failed", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log("[worker] stopped");
}

void main();
