export const IELTS_PART_TYPES = {
  part1: "IELTS_PART_1",
  part2: "IELTS_PART_2_CUE_CARD",
  part3: "IELTS_PART_3",
} as const;

export type IeltsQuestionType = (typeof IELTS_PART_TYPES)[keyof typeof IELTS_PART_TYPES];

export type IeltsQuestionCandidate = {
  id: string;
  code: string;
  questionType: IeltsQuestionType;
  groupId: string | null;
  topicId: string | null;
};

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  return values
    .map((value) => ({ value, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ value }) => value);
}

function testSet(code: string): string | null {
  return code.match(/^IELTS_(T\d+)_P[23]_/i)?.[1]?.toUpperCase() ?? null;
}

function relationshipRank(part2: IeltsQuestionCandidate, part3: IeltsQuestionCandidate): number {
  if (part2.groupId && part2.groupId === part3.groupId) return 0;
  if (part2.topicId && part2.topicId === part3.topicId) return 1;
  const set = testSet(part2.code);
  if (set && set === testSet(part3.code)) return 2;
  return 3;
}

export function selectIeltsSessionQuestions(
  candidates: readonly IeltsQuestionCandidate[],
  random: () => number = Math.random,
): IeltsQuestionCandidate[] {
  const unique = [...new Map(candidates.map((question) => [question.id, question])).values()];
  const part1 = shuffled(unique.filter((q) => q.questionType === IELTS_PART_TYPES.part1), random);
  const part2 = shuffled(unique.filter((q) => q.questionType === IELTS_PART_TYPES.part2), random);
  const part3 = shuffled(unique.filter((q) => q.questionType === IELTS_PART_TYPES.part3), random);
  if (part1.length < 2 || part2.length < 1 || part3.length < 2) {
    throw new Error("Not enough active IELTS questions for a 2/1/2 session.");
  }

  const selectedPart2 = part2[0];
  const rankedPart3 = part3
    .map((question, index) => ({ question, index, rank: relationshipRank(selectedPart2, question) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, 2)
    .map(({ question }) => question);
  return [part1[0], part1[1], selectedPart2, ...rankedPart3];
}
