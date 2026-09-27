import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import type { SpeakingPronunciationFeedback } from "./types";

const UNAVAILABLE: SpeakingPronunciationFeedback = {
  available: false,
  summary: "Chưa thể phân tích phát âm cho phiên này",
  practiceWords: [],
};

export function mapSpeakingPronunciationFeedback(
  providerMetadata: readonly unknown[],
): SpeakingPronunciationFeedback {
  const results = providerMetadata.flatMap((metadata) => {
    const pronunciation = record(metadata)?.pronunciation;
    const envelope = record(pronunciation);
    return envelope?.provider === "lingolix" && isPronunciationResult(envelope.result)
      ? [envelope.result]
      : [];
  });
  if (!results.length) return UNAVAILABLE;

  let needsAttention = results.some((result) => result.overall.accuracy < 80);
  const practiceWords: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    for (const word of result.words) {
      const needsPractice = word.accuracy < 70 || word.syllables.some((syllable) => (
        syllable.accuracy < 70 || syllable.isMissing || syllable.isExtra
      ));
      if (!needsPractice) continue;
      needsAttention = true;
      const text = word.text.trim();
      const key = text.toLocaleLowerCase("en");
      if (!text || seen.has(key)) continue;
      seen.add(key);
      if (practiceWords.length < 3) practiceWords.push(text);
    }
  }

  return {
    available: true,
    summary: needsAttention ? "Một số từ cần chú ý" : "Phát âm nhìn chung rõ ràng",
    practiceWords,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isPronunciationResult(value: unknown): value is PronunciationAnalysisResult {
  const result = record(value);
  const overall = record(result?.overall);
  if (result?.schemaVersion !== 1 || result.languageCode !== "en"
    || typeof overall?.accuracy !== "number" || !Number.isFinite(overall.accuracy)
    || !Array.isArray(result.words)) return false;

  return result.words.every((candidate) => {
    const word = record(candidate);
    return typeof word?.text === "string"
      && typeof word.accuracy === "number"
      && Number.isFinite(word.accuracy)
      && Array.isArray(word.syllables)
      && word.syllables.every((part) => {
        const syllable = record(part);
        return typeof syllable?.accuracy === "number"
          && Number.isFinite(syllable.accuracy)
          && typeof syllable.isMissing === "boolean"
          && typeof syllable.isExtra === "boolean";
      });
  });
}
