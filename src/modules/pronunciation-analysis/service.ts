import type { PronunciationAnalysisResult } from "./types";

export type PronunciationAnalysisRequest = {
  audio: Blob;
  fileName: string;
  sentence: string;
};

export type PronunciationAnalysisResponse = {
  result: PronunciationAnalysisResult;
  rawResult: Record<string, unknown>;
};

export interface PronunciationAnalysisProvider {
  analyze(input: PronunciationAnalysisRequest): Promise<PronunciationAnalysisResponse>;
}
