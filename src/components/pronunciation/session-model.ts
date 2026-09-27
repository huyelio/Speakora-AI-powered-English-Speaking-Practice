import type { PronunciationSyllableAnalysis } from "../../modules/pronunciation-analysis/types";
import type { PronunciationSessionItem } from "../../modules/pronunciation-practice/types";
import { summarizePronunciationItems } from "../../modules/pronunciation-practice/scoring";

export const bandLabels = { GOOD: "Tốt", PRACTICE: "Cần luyện thêm", WEAK: "Cần cải thiện" } as const;
export const levelLabels = { BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" } as const;

// Conservative spelling alignment: never render IPA, punctuation, missing or extra
// syllables as if they were the spelling of the reference word.
export function composeSyllables(word: string, syllables: PronunciationSyllableAnalysis[]): string[] | null {
  if (!/^[a-z]+$/i.test(word) || !syllables.length
    || syllables.some((part) => !/^[a-z]+$/i.test(part.text) || part.isExtra || part.isMissing)
    || syllables.map((part) => part.text).join("").toLowerCase() !== word.toLowerCase()) return null;
  let offset = 0;
  return syllables.map((part) => {
    const text = word.slice(offset, offset + part.text.length);
    offset += part.text.length;
    return text;
  });
}

export function firstPendingIndex(items: PronunciationSessionItem[]): number {
  return items.findIndex((item) => !item.latestSuccessfulAttempt);
}

export function initialSyllableIndex(syllables: PronunciationSyllableAnalysis[]): number | null {
  if (!syllables.length) return null;
  return syllables.reduce((weakest, syllable, index) => {
    const weakestSyllable = syllables[weakest];
    const priority = syllable.isMissing || syllable.isExtra ? -1 : syllable.accuracy;
    const weakestPriority = weakestSyllable.isMissing || weakestSyllable.isExtra
      ? -1
      : weakestSyllable.accuracy;
    return priority < weakestPriority ? index : weakest;
  }, 0);
}

export function shouldAutoSubmitRecording(
  recordingKey: string | null,
  submittedKey: string | null,
  hasFeedback: boolean,
): boolean {
  return Boolean(recordingKey && recordingKey !== submittedKey && !hasFeedback);
}

export function summarizeItems(items: PronunciationSessionItem[]) {
  return summarizePronunciationItems(items.map((item) => ({ word: item.snapshot.word, result: item.latestSuccessfulAttempt?.result ?? null })));
}

export function problemSyllables(item: PronunciationSessionItem): PronunciationSyllableAnalysis[] {
  return item.latestSuccessfulAttempt?.result.words.flatMap((word) => word.syllables)
    .filter((part) => part.accuracy < 70 || part.isMissing || part.isExtra) ?? [];
}
