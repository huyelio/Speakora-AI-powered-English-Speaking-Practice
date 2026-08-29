import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "../lib/supabase/config";
import { OpenAIProvider } from "../modules/ai-gateway/openai";
import type { PracticeMode } from "../modules/practice/types";
import {
  createJobProcessors,
  type AssessmentRecord,
  type ProcessingJob,
  type TranscriptPair,
  type WorkerDatabase,
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

async function fail(job: ProcessingJob, error: unknown): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
  const terminal = job.attempt_count >= job.max_attempts;
  const delay = Math.min(60, 2 ** job.attempt_count);
  const { error: jobError } = await db
    .from("processing_jobs")
    .update({
      status: terminal ? "FAILED" : "QUEUED",
      next_retry_at: new Date(Date.now() + delay * 1000).toISOString(),
      locked_at: null,
      locked_by: null,
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  requireNoError(jobError);

  if (terminal && job.answer_id) {
    const { error: answerError } = await db
      .from("user_answers")
      .update({ status: "FAILED", error_message: message })
      .eq("id", job.answer_id);
    requireNoError(answerError);
  }
  if (terminal) {
    const { error: sessionError } = await db
      .from("practice_sessions")
      .update({ status: "FAILED" })
      .eq("id", job.session_id);
    requireNoError(sessionError);
  }
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

const processors = createJobProcessors({ db: workerDatabase, provider });

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
        await fail(job, error);
      }
    } catch (error) {
      console.error("[worker] polling failed", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log("[worker] stopped");
}

void main();
