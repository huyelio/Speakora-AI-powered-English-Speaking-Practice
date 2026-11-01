import "server-only";

import { AzurePronunciationProvider } from "../pronunciation-analysis/azure";
import type { PronunciationAnalysisProvider } from "../pronunciation-analysis/service";
import {
  completePronunciationAttempt,
  failPronunciationAttempt,
  type CompletePronunciationAttemptInput,
} from "./repository";
import { classifyPronunciationScore } from "./scoring";
import type { PronunciationAttemptForProcessing, SuccessfulPronunciationAttempt } from "./types";

type ProcessorDependencies = {
  provider?: PronunciationAnalysisProvider;
  complete?: typeof completePronunciationAttempt;
  fail?: typeof failPronunciationAttempt;
  timeoutMs?: number;
  /** Analysis already running, so the learner does not also wait for the upload and registration. */
  analysis?: ReturnType<PronunciationAnalysisProvider["analyze"]>;
};

export function startPronunciationAnalysis(
  word: string,
  audio: Blob,
  fileName: string,
  { provider = new AzurePronunciationProvider(), timeoutMs = 30_000 }: Pick<ProcessorDependencies, "provider" | "timeoutMs"> = {},
) {
  return provider.analyze({
    mode: "SCRIPTED",
    audio,
    fileName,
    referenceText: word,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function processPronunciationAttempt(
  attempt: PronunciationAttemptForProcessing,
  userId: string,
  audio: Blob,
  dependencies: ProcessorDependencies = {},
) {
  const complete = dependencies.complete ?? completePronunciationAttempt;
  const fail = dependencies.fail ?? failPronunciationAttempt;
  let analysis;
  try {
    analysis = await (dependencies.analysis ?? startPronunciationAnalysis(
      attempt.snapshot.word,
      audio,
      attempt.storagePath.split("/").at(-1) || `attempt.${extensionForMime(attempt.mimeType)}`,
      dependencies,
    ));
  } catch {
    await fail(
      attempt.attemptId,
      userId,
      "PROVIDER_ERROR",
      "Không thể phân tích phát âm. Vui lòng thử lại.",
    );
    return {
      ok: false as const,
      attemptId: attempt.attemptId,
      status: "FAILED" as const,
      error: "Không thể phân tích phát âm. Vui lòng thử lại.",
    };
  }

  const input: CompletePronunciationAttemptInput = {
    attemptId: attempt.attemptId,
    userId,
    provider: "azure",
    normalizedResult: analysis.result,
    rawResult: analysis.rawResult,
  };
  const completed = await complete(input);
  const score = analysis.result.overall.accuracy;
  const saved: SuccessfulPronunciationAttempt = {
    attemptId: attempt.attemptId,
    provider: "azure",
    result: analysis.result,
    score,
    scoreBand: classifyPronunciationScore(score),
    completedAt: new Date().toISOString(),
  };
  return {
    ok: true as const,
    attemptId: attempt.attemptId,
    status: "COMPLETED" as const,
    sessionStatus: completed.sessionStatus,
    result: analysis.result,
    attempt: saved,
  };
}

function extensionForMime(mimeType: string) {
  if (mimeType.toLowerCase().startsWith("audio/mp4")) return "mp4";
  if (mimeType.toLowerCase().startsWith("audio/ogg")) return "ogg";
  return "webm";
}
