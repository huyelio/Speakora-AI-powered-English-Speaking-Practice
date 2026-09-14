export const DEFAULT_PRACTICE_QUESTION_COUNT = 5;
export const MIN_PRACTICE_QUESTION_COUNT = 1;
export const MAX_PRACTICE_QUESTION_COUNT = 20;
export const IELTS_PRACTICE_QUESTION_COUNT = 5;

export function isValidPracticeQuestionCount(value: unknown): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= MIN_PRACTICE_QUESTION_COUNT
    && value <= MAX_PRACTICE_QUESTION_COUNT;
}
