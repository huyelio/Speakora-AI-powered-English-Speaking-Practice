import "server-only";

import { LingolixPronunciationProvider } from "../pronunciation-analysis/lingolix";
import type { PronunciationAnalysisProvider } from "../pronunciation-analysis/service";
import {
  completePronunciationAttempt,
  failPronunciationAttempt,
  type CompletePronunciationAttemptInput,
} from "./repository";
import type { PronunciationAttemptForProcessing } from "./types";

type ProcessorDependencies = {
  provider?: PronunciationAnalysisProvider;
  complete?: typeof completePronunciationAttempt;
  fail?: typeof failPronunciationAttempt;
};

export async function processPronunciationAttempt(
  attempt: PronunciationAttemptForProcessing,
  userId: string,
  audio: Blob,
  dependencies: ProcessorDependencies = {},
) {
  const provider = dependencies.provider ?? new LingolixPronunciationProvider();
  const complete = dependencies.complete ?? completePronunciationAttempt;
  const fail = dependencies.fail ?? failPronunciationAttempt;
  let analysis;
  try {
    analysis = await provider.analyze({
      audio,
      fileName: attempt.storagePath.split("/").at(-1) || `attempt.${extensionForMime(attempt.mimeType)}`,
      sentence: attempt.snapshot.word,
    });
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
    provider: "lingolix",
    normalizedResult: analysis.result,
    rawResult: analysis.rawResult,
  };
  const completed = await complete(input);
  return {
    ok: true as const,
    attemptId: attempt.attemptId,
    status: "COMPLETED" as const,
    sessionStatus: completed.sessionStatus,
    result: analysis.result,
  };
}

function extensionForMime(mimeType: string) {
  if (mimeType.toLowerCase().startsWith("audio/mp4")) return "mp4";
  if (mimeType.toLowerCase().startsWith("audio/ogg")) return "ogg";
  return "webm";
}
