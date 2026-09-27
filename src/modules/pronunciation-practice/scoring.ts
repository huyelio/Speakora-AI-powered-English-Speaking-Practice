import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import type { PronunciationScoreBand, PronunciationSessionSummary } from "./types";

export function classifyPronunciationScore(score: number): PronunciationScoreBand {
  if (score >= 85) return "GOOD";
  if (score >= 70) return "PRACTICE";
  return "WEAK";
}

export function isWeakPronunciationResult(result: PronunciationAnalysisResult): boolean {
  if (result.overall.accuracy < 80) return true;
  return result.words.some((word) => word.syllables.some((syllable) => (
    syllable.accuracy < 70 || syllable.isMissing || syllable.isExtra
  )));
}

export function summarizePronunciationItems(
  items: Array<{ word: string; result: PronunciationAnalysisResult | null }>,
): PronunciationSessionSummary {
  const completed = items.filter(
    (item): item is { word: string; result: PronunciationAnalysisResult } => item.result !== null,
  );
  const scores = completed.map((item) => item.result.overall.accuracy);
  const bands = scores.map(classifyPronunciationScore);

  return {
    averageScore: scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
      : null,
    completedCount: completed.length,
    goodCount: bands.filter((band) => band === "GOOD").length,
    practiceCount: bands.filter((band) => band === "PRACTICE").length,
    weakCount: bands.filter((band) => band === "WEAK").length,
    weakWords: completed
      .filter((item) => isWeakPronunciationResult(item.result))
      .map((item) => item.word),
  };
}
