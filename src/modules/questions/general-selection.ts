import type { LearnerLevel } from "../profile/types";

export type GeneralCandidate = {
  id: string;
  code: string;
  topicId: string;
  difficulty: LearnerLevel;
  lastAnsweredAt: string | null;
};

export function selectGeneralQuestions(
  candidates: readonly GeneralCandidate[],
  recentQuestionIds: readonly string[],
  count: number,
): GeneralCandidate[] {
  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  if (uniqueCandidates.length < count) {
    throw new Error(`Not enough active questions for this topic; need ${count}, found ${uniqueCandidates.length}`);
  }

  const recentIds = new Set(recentQuestionIds);
  const unseen = uniqueCandidates.filter((candidate) => !recentIds.has(candidate.id));
  const seen = uniqueCandidates
    .filter((candidate) => recentIds.has(candidate.id))
    .sort((left, right) => {
      const leftTime = left.lastAnsweredAt ? Date.parse(left.lastAnsweredAt) : Number.NEGATIVE_INFINITY;
      const rightTime = right.lastAnsweredAt ? Date.parse(right.lastAnsweredAt) : Number.NEGATIVE_INFINITY;
      return leftTime - rightTime || left.code.localeCompare(right.code);
    });

  return [...unseen, ...seen].slice(0, count);
}
