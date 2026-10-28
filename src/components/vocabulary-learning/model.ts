import type { PronunciationAnalysisResult } from "../../modules/pronunciation-analysis/types";
import { isWeakPronunciationResult } from "../../modules/pronunciation-practice/scoring";

export function pronunciationFeedback(result: PronunciationAnalysisResult | null): "GOOD" | "WEAK" | "UNKNOWN" {
  if (!result || !Number.isFinite(result.overall?.accuracy) || result.overall.accuracy < 0 || result.overall.accuracy > 100) return "UNKNOWN";
  if (!Array.isArray(result.words) || !result.words.length || result.words.some(word => !word || !Array.isArray(word.syllables) || !word.syllables.length)) return "UNKNOWN";
  const syllables = result.words.flatMap(word => word.syllables);
  if (syllables.some(part => !part || !Number.isFinite(part.accuracy) || part.accuracy < 0 || part.accuracy > 100 || typeof part.isMissing !== "boolean" || typeof part.isExtra !== "boolean")) return "UNKNOWN";
  return isWeakPronunciationResult(result) ? "WEAK" : "GOOD";
}
