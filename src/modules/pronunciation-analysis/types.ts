export type PronunciationPitch = "HIGH" | "LOW" | "FLAT" | "UNKNOWN";

export type PronunciationPhonemeAnalysis = {
  expectedIpa: string | null;
  detectedIpa: string | null;
  accuracy: number;
  startMs: number | null;
  endMs: number | null;
  errorType: string | null;
  alternatives: Array<{ ipa: string; score: number }>;
};

export type PronunciationSyllableAnalysis = {
  text: string;
  expectedIpa: string | null;
  detectedIpa: string | null;
  accuracy: number;
  completeness: number | null;
  pitch: PronunciationPitch;
  durationMs: number | null;
  startMs: number | null;
  endMs: number | null;
  isMissing: boolean;
  isExtra: boolean;
  phonemes?: PronunciationPhonemeAnalysis[];
};

export type PronunciationWordAnalysis = {
  text: string;
  syllables: PronunciationSyllableAnalysis[];
  phonemes?: PronunciationPhonemeAnalysis[];
  accuracy: number;
  completeness: number | null;
  startMs: number | null;
  endMs: number | null;
  charStart: number;
  charEnd: number;
  errorType?: string | null;
};

export type PronunciationOverallAnalysis = {
  speakingRate: number | null;
  accuracy: number;
  completeness: number | null;
  pronunciation?: number | null;
  fluency?: number | null;
  prosody?: number | null;
};

export type PronunciationSpeechMetrics = {
  durationMs: number | null;
  wordCount: number;
  wpm: number | null;
  longPauseCount: number;
  longPausesMs: number[];
  fillerCount: number;
  repetitionCount: number;
  examples: string[];
};

export type PronunciationAnalysisResult = {
  schemaVersion: 1 | 2;
  assessmentMode?: "SCRIPTED" | "UNSCRIPTED";
  referenceText: string | null;
  sourceTranscript?: string | null;
  scoredText: string;
  languageCode: "en";
  overall: PronunciationOverallAnalysis;
  words: PronunciationWordAnalysis[];
  metrics?: PronunciationSpeechMetrics;
};
