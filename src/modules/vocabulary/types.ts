import type { LearnerLevel } from "../profile/types";

export type VocabularyReviewResult = "REMEMBERED" | "NOT_REMEMBERED";

export type VocabularyItemSnapshot = {
  word: string;
  meaning_vi: string;
  definition_en: string | null;
  example_sentence: string;
  pronunciation_ipa: string | null;
  level: LearnerLevel;
  first_letter_hint: string;
};

export type VocabularySessionItem = {
  sessionItemId: string;
  sequenceNo: number;
  vocabularyItemId: string;
  snapshot: VocabularyItemSnapshot;
  review: VocabularyReviewResult | null;
};

export type VocabularySessionStatus = "IN_PROGRESS" | "COMPLETED";

export type ClientVocabularySession = {
  sessionId: string;
  topic: { id: string; slug: string; name: string };
  level: LearnerLevel;
  itemCount: number;
  status: VocabularySessionStatus;
  items: VocabularySessionItem[];
  rememberedCount: number;
  notRememberedCount: number;
};

export function buildFirstLetterHint(word: string): string {
  const letters = word.replace(/[^A-Za-z]/g, "");
  if (!letters) return word.toUpperCase();
  const first = letters[0].toUpperCase();
  return first + "_".repeat(Math.max(letters.length - 1, 0));
}
