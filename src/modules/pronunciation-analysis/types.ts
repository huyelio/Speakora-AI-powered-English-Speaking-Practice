export type PronunciationPitch = "HIGH" | "LOW" | "FLAT" | "UNKNOWN";

export type PronunciationSyllableAnalysis = {
  text: string;
  expectedIpa: string;
  detectedIpa: string;
  accuracy: number;
  completeness: number;
  pitch: PronunciationPitch;
  durationMs: number | null;
  startMs: number | null;
  endMs: number | null;
  isMissing: boolean;
  isExtra: boolean;
};

export type PronunciationWordAnalysis = {
  text: string;
  syllables: PronunciationSyllableAnalysis[];
  accuracy: number;
  completeness: number;
  startMs: number | null;
  endMs: number | null;
  charStart: number;
  charEnd: number;
};

export type PronunciationOverallAnalysis = {
  speakingRate: number;
  accuracy: number;
  completeness: number;
};

export type PronunciationAnalysisResult = {
  schemaVersion: 1;
  referenceText: string;
  scoredText: string;
  languageCode: "en";
  overall: PronunciationOverallAnalysis;
  words: PronunciationWordAnalysis[];
};
