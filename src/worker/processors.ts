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
  getSessionMode(sessionId: string): Promise<PracticeMode>;
  getTranscriptPairs(sessionId: string): Promise<TranscriptPair[]>;
  saveAssessment(record: AssessmentRecord): Promise<void>;
  markSessionCompleted(sessionId: string, completedAt: string): Promise<void>;
  completeSessionRewards(sessionId: string): Promise<{ awardedXp: number }>;
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

    if (await deps.db.countTranscribedAnswers(job.session_id) === 5) {
      await deps.db.enqueueAssessment(job.session_id);
      await deps.db.markSessionProcessing(job.session_id);
    }
    await deps.db.markJobSucceeded(job.id);
  }

  async function runAssessment(job: ProcessingJob): Promise<void> {
    const mode = await deps.db.getSessionMode(job.session_id);
    const pairs = await deps.db.getTranscriptPairs(job.session_id);
    if (pairs.length !== 5) throw new Error("Session does not have five transcripts.");
    const input = pairs
      .map((pair) => `Question ${pair.sequence}: ${pair.question}\nAnswer: ${pair.transcript}`)
      .join("\n\n");
    const evidence = pairs.map((pair) => pair.transcript).join("\n");
    const providerOutput = await deps.provider.assess(input, mode);
    const assessment = mode === "GENERAL"
      ? (() => {
          const result = parseGeneralAssessmentOutput(providerOutput, evidence);
          return {
            assessmentMode: mode,
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
            assessmentMode: mode,
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
    await deps.db.markJobSucceeded(job.id);
  }

  return { runStt, runAssessment };
}
