import type { AssessmentProvider, SpeechToTextProvider } from "../modules/ai-gateway/openai";
import { parseGeneralAssessmentOutput } from "../modules/assessment/general-schema";
import { parseAssessmentOutput } from "../modules/assessment/schema";
import type { PracticeMode } from "../modules/practice/types";

export type ProcessingJob = {
  id: string;
  session_id: string;
  answer_id: string | null;
  job_type: "STT" | "ASSESSMENT";
  attempt_count: number;
  max_attempts: number;
};

export type WorkerAnswer = {
  id: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
};

export type TranscriptPair = {
  sequence: number;
  question: string;
  transcript: string;
};

export type AssessmentRecord = {
  sessionId: string;
  assessmentMode: PracticeMode;
  estimatedBand: number | null;
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  provider: "openai";
  model: string;
  promptVersion: string;
  rawOutput: Record<string, unknown>;
};

export interface WorkerDatabase {
  getAnswer(answerId: string): Promise<WorkerAnswer>;
  markAnswerTranscribing(answerId: string): Promise<void>;
  downloadAudio(bucket: string, path: string): Promise<Blob>;
  saveTranscript(input: { answerId: string; text: string; provider: "openai"; model: string }): Promise<void>;
  markAnswerTranscribed(answerId: string): Promise<void>;
  countTranscribedAnswers(sessionId: string): Promise<number>;
  enqueueAssessment(sessionId: string): Promise<void>;
  markSessionProcessing(sessionId: string): Promise<void>;
  markJobSucceeded(jobId: string): Promise<void>;
  getSessionContext(sessionId: string): Promise<{ mode: PracticeMode; questionCount: number }>;
  getTranscriptPairs(sessionId: string): Promise<TranscriptPair[]>;
  saveAssessment(record: AssessmentRecord): Promise<void>;
  markSessionCompleted(sessionId: string, completedAt: string): Promise<void>;
  completeSessionRewards(sessionId: string): Promise<{ awardedXp: number }>;
}

export type JobFailureRecord = {
  jobId: string;
  status: "QUEUED" | "FAILED";
  nextRetryAt: string;
  errorMessage: string;
};

export interface WorkerFailureDatabase {
  isAssessmentPublished(sessionId: string): Promise<boolean>;
  markJobSucceeded(jobId: string): Promise<void>;
  markJobFailure(record: JobFailureRecord): Promise<void>;
  markAnswerFailed(answerId: string, errorMessage: string): Promise<void>;
  markSessionFailed(sessionId: string): Promise<void>;
}

type JobFailureHandlerDependencies = {
  db: WorkerFailureDatabase;
  now?: () => Date;
};

export class AssessmentPublishedJobError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("Assessment was published, but the job success status could not be persisted.");
    this.name = "AssessmentPublishedJobError";
    this.cause = cause;
  }
}

export function createJobFailureHandler(deps: JobFailureHandlerDependencies) {
  const now = deps.now ?? (() => new Date());

  return async function handleJobFailure(job: ProcessingJob, error: unknown): Promise<void> {
    const delaySeconds = Math.min(60, 2 ** job.attempt_count);
    const nextRetryAt = new Date(now().getTime() + delaySeconds * 1000).toISOString();
    const markRetryable = async (retryError: unknown): Promise<void> => {
      const errorMessage = (retryError instanceof Error ? retryError.message : String(retryError)).slice(0, 1000);
      await deps.db.markJobFailure({ jobId: job.id, status: "QUEUED", nextRetryAt, errorMessage });
    };

    let published: boolean;
    try {
      published = await deps.db.isAssessmentPublished(job.session_id);
    } catch (publicationError) {
      await markRetryable(publicationError);
      return;
    }

    if (published || error instanceof AssessmentPublishedJobError) {
      if (error instanceof AssessmentPublishedJobError) {
        try {
          await deps.db.markJobSucceeded(job.id);
          return;
        } catch (reconciliationError) {
          await markRetryable(reconciliationError);
          return;
        }
      }
      await markRetryable(error);
      return;
    }

    const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
    const terminal = job.attempt_count >= job.max_attempts;
    await deps.db.markJobFailure({
      jobId: job.id,
      status: terminal ? "FAILED" : "QUEUED",
      nextRetryAt,
      errorMessage,
    });
    if (terminal && job.answer_id) await deps.db.markAnswerFailed(job.answer_id, errorMessage);
    if (terminal) await deps.db.markSessionFailed(job.session_id);
  };
}

type JobProcessorDependencies = {
  db: WorkerDatabase;
  provider: AssessmentProvider & SpeechToTextProvider;
  now?: () => Date;
  sttModel?: string;
  assessmentModel?: string;
};

export function createJobProcessors(deps: JobProcessorDependencies) {
  const now = deps.now ?? (() => new Date());
  const sttModel = deps.sttModel ?? process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe";
  const assessmentModel = deps.assessmentModel ?? process.env.OPENAI_ASSESSMENT_MODEL ?? "gpt-4o-mini";

  async function runStt(job: ProcessingJob): Promise<void> {
    if (!job.answer_id) throw new Error("STT job is missing an answer.");
    const answer = await deps.db.getAnswer(job.answer_id);
    await deps.db.markAnswerTranscribing(answer.id);
    const file = await deps.db.downloadAudio(answer.storageBucket, answer.storagePath);
    const name = answer.storagePath.split("/").pop() || "answer.webm";
    const text = await deps.provider.transcribe(file, name);
    await deps.db.saveTranscript({ answerId: answer.id, text, provider: "openai", model: sttModel });
    await deps.db.markAnswerTranscribed(answer.id);

    const session = await deps.db.getSessionContext(job.session_id);
    if (await deps.db.countTranscribedAnswers(job.session_id) === session.questionCount) {
      await deps.db.enqueueAssessment(job.session_id);
      await deps.db.markSessionProcessing(job.session_id);
    }
    await deps.db.markJobSucceeded(job.id);
  }

  async function runAssessment(job: ProcessingJob): Promise<void> {
    const session = await deps.db.getSessionContext(job.session_id);
    const pairs = await deps.db.getTranscriptPairs(job.session_id);
    if (pairs.length !== session.questionCount) {
      throw new Error(`Session does not have ${session.questionCount} transcripts.`);
    }
    const input = pairs
      .map((pair) => `Question ${pair.sequence}: ${pair.question}\nAnswer: ${pair.transcript}`)
      .join("\n\n");
    const evidence = pairs.map((pair) => pair.transcript).join("\n");
    const providerOutput = await deps.provider.assess(input, session.mode);
    const assessment = session.mode === "GENERAL"
      ? (() => {
          const result = parseGeneralAssessmentOutput(providerOutput, evidence);
          return {
            assessmentMode: session.mode,
            estimatedBand: null,
            overallFeedback: result.overall_feedback,
            strengths: result.strengths,
            improvements: result.improvements,
            nextSteps: result.next_steps,
            promptVersion: "general-session-v1",
            rawOutput: result,
          };
        })()
      : (() => {
          const result = parseAssessmentOutput(providerOutput, evidence);
          return {
            assessmentMode: session.mode,
            estimatedBand: result.estimated_band,
            overallFeedback: result.overall_feedback,
            strengths: result.strengths,
            improvements: result.improvements,
            nextSteps: result.next_steps,
            promptVersion: "ielts-session-v3",
            rawOutput: result,
          };
        })();

    await deps.db.saveAssessment({
      sessionId: job.session_id,
      ...assessment,
      provider: "openai",
      model: assessmentModel,
    });
    await deps.db.markSessionCompleted(job.session_id, now().toISOString());
    await deps.db.completeSessionRewards(job.session_id);
    try {
      await deps.db.markJobSucceeded(job.id);
    } catch (error) {
      throw new AssessmentPublishedJobError(error);
    }
  }

  return { runStt, runAssessment };
}
