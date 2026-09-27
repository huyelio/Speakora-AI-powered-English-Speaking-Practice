import type { PronunciationAnalysisResult } from "./types";

export type PronunciationAnalysisRequest = {
  audio: Blob;
  fileName: string;
  sentence: string;
};

export interface PronunciationAnalysisProvider {
  analyze(input: PronunciationAnalysisRequest): Promise<PronunciationAnalysisResult>;
}
