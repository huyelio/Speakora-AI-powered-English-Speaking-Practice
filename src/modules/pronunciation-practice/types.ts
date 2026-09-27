import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import type { LearnerLevel } from "../profile/types";

export type PronunciationScoreBand = "GOOD" | "PRACTICE" | "WEAK";
export type PronunciationSessionStatus = "IN_PROGRESS" | "COMPLETED";
export type PronunciationAttemptStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type PronunciationItemSnapshot = {
  word: string;
  pronunciationIpa: string;
  meaningVi: string;
  level: LearnerLevel;
};

export type SuccessfulPronunciationAttempt = {
  attemptId: string;
  provider: string;
  result: PronunciationAnalysisResult;
  score: number;
  scoreBand: PronunciationScoreBand;
  completedAt: string;
};

export type PronunciationSessionItem = {
  sessionItemId: string;
  vocabularyItemId: string;
  sequenceNo: number;
  snapshot: PronunciationItemSnapshot;
  latestSuccessfulAttempt: SuccessfulPronunciationAttempt | null;
};

export type PronunciationSessionSummary = {
  averageScore: number | null;
  completedCount: number;
  goodCount: number;
  practiceCount: number;
  weakCount: number;
  weakWords: string[];
};

export type ClientPronunciationSession = {
  sessionId: string;
  sourceSessionId: string | null;
  topic: { id: string; slug: string; name: string };
  level: LearnerLevel;
  itemCount: number;
  status: PronunciationSessionStatus;
  items: PronunciationSessionItem[];
  summary: PronunciationSessionSummary;
};

export type PronunciationAttemptForProcessing = {
  attemptId: string;
  sessionId: string;
  sessionItemId: string;
  status: PronunciationAttemptStatus;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  processingStartedAt: string | null;
  snapshot: PronunciationItemSnapshot;
};
