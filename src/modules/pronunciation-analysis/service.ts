import type { PronunciationAnalysisResult } from "./types";

type PronunciationAnalysisRequestBase = {
  audio: Blob;
  fileName: string;
  signal?: AbortSignal;
};

export type PronunciationAnalysisRequest = PronunciationAnalysisRequestBase & (
  | { mode: "SCRIPTED"; referenceText: string }
  | { mode: "UNSCRIPTED"; transcript: string; durationMs: number | null }
);

export type PronunciationAnalysisResponse = {
  result: PronunciationAnalysisResult;
  rawResult: Record<string, unknown>;
};

export interface PronunciationAnalysisProvider {
  analyze(input: PronunciationAnalysisRequest): Promise<PronunciationAnalysisResponse>;
}
