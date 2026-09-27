import type { PronunciationSyllableAnalysis } from "../../modules/pronunciation-analysis/types";
import type { PronunciationSessionItem } from "../../modules/pronunciation-practice/types";
import { summarizePronunciationItems } from "../../modules/pronunciation-practice/scoring";

export const levelLabels = { BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" } as const;
export const PRONUNCIATION_SUCCESS_THRESHOLD = 70;

export function isSyllableSuccessful(syllable: PronunciationSyllableAnalysis): boolean {
  return syllable.accuracy >= PRONUNCIATION_SUCCESS_THRESHOLD
    && !syllable.isMissing
    && !syllable.isExtra;
}

export function isWordSuccessful(syllables: PronunciationSyllableAnalysis[]): boolean {
  return syllables.length > 0 && syllables.every(isSyllableSuccessful);
}

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
    .filter((part) => !isSyllableSuccessful(part)) ?? [];
}
