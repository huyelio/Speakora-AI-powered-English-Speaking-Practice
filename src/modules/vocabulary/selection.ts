import type { LearnerLevel } from "../profile/types";

export type VocabularyCandidate = {
  id: string;
  word: string;
};

export function selectVocabularyItems(
  candidates: VocabularyCandidate[],
  count: number,
  random: () => number = Math.random,
): VocabularyCandidate[] {
  if (count < 1 || count > 20) {
    throw new Error("itemCount must be between 1 and 20.");
  }
  if (candidates.length < count) {
    throw new Error(`Need ${count} items but only ${candidates.length} available.`);
  }

  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function isLearnerLevel(value: unknown): value is LearnerLevel {
  return value === "BEGINNER" || value === "INTERMEDIATE" || value === "ADVANCED";
}
