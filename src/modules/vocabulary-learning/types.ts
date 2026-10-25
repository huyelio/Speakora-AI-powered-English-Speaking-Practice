import type { ClientPronunciationSession } from "../pronunciation-practice/types";
import type { VocabularyItemSnapshot, VocabularyReviewResult } from "../vocabulary/types";

export type LearningState = "NEW" | "LEARNING" | "WEAK" | "MASTERED";
export type LearningStage = "LEARN" | "PRONOUNCE" | "RECALL" | "CONTEXT" | "SUMMARY";
export type LearningEvidence = {
  latestReview: VocabularyReviewResult | null;
  recalls: boolean[];
  pronunciation: "UNASSESSED" | "UNKNOWN" | "GOOD" | "WEAK";
  lastPracticedAt: string | null;
};
export type LearningItem = {
  sessionItemId: string;
  vocabularyItemId: string;
  sequenceNo: number;
  snapshot: VocabularyItemSnapshot & { context_prompt: string | null; initial_evidence: LearningEvidence };
  review: VocabularyReviewResult | null;
  contextResult: VocabularyReviewResult | null;
  evidence: LearningEvidence;
};
export type LearningSession = {
  sessionId: string;
  topic: ClientPronunciationSession["topic"];
  level: ClientPronunciationSession["level"];
  stage: LearningStage;
  cursor: number;
  contextItemIds: string[];
  items: LearningItem[];
  pronunciation: ClientPronunciationSession;
};
