import type { LearningEvidence, LearningState } from "./types";

export const EMPTY_EVIDENCE: LearningEvidence = { latestReview: null, recalls: [], pronunciation: "UNASSESSED", lastPracticedAt: null };
export function deriveState(e: LearningEvidence): LearningState {
  if (e.latestReview === "NOT_REMEMBERED" || e.pronunciation === "WEAK") return "WEAK";
  if (e.recalls.length >= 2 && e.recalls[0] && e.recalls[1] && e.pronunciation === "GOOD") return "MASTERED";
  if (e.latestReview === null && e.recalls.length === 0 && e.pronunciation === "UNASSESSED") return "NEW";
  return "LEARNING";
}
export function selectItems<T extends { id: string; evidence: LearningEvidence }>(items: T[], masteredOnly = false): T[] {
  const rank = { WEAK: 0, LEARNING: 1, NEW: 2, MASTERED: 3 };
  return [...new Map(items.map(item => [item.id, item])).values()]
    .filter(item => (deriveState(item.evidence) === "MASTERED") === masteredOnly)
    .sort((a, b) => rank[deriveState(a.evidence)] - rank[deriveState(b.evidence)]
      || (a.evidence.lastPracticedAt ?? "").localeCompare(b.evidence.lastPracticedAt ?? "") || a.id.localeCompare(b.id))
    .slice(0, 6);
}
export function checkAnswer(answer: string, word: string): boolean {
  return answer.trim().toLowerCase() === word.trim().toLowerCase();
}
export function contextPrompt(word: string, example: string): string | null {
  if (!word.trim()) return null;
  const literal = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${literal}(?![\\p{L}\\p{N}_])`, "giu");
  return pattern.test(example) ? example.replace(pattern, "_____") : null;
}
export function selectContext(items: { id: string; prompt: string | null; recallWrong: boolean; pronunciationWeak: boolean }[]): string[] {
  const rank = (item: typeof items[number]) => item.recallWrong ? 0 : item.pronunciationWeak ? 1 : 2;
  return items.filter(item => item.prompt !== null).sort((a, b) => rank(a) - rank(b)).slice(0, 3).map(item => item.id);
}
export function hasImproved(before: LearningEvidence, after: LearningEvidence): boolean {
  const ranks = { NEW: 0, WEAK: 0, LEARNING: 1, MASTERED: 2 };
  return ranks[deriveState(after)] > ranks[deriveState(before)]
    || (before.latestReview !== "REMEMBERED" && after.latestReview === "REMEMBERED")
    || (before.pronunciation !== "GOOD" && after.pronunciation === "GOOD");
}
