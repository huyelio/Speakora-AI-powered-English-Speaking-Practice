export const DEFAULT_VOCABULARY_ITEM_COUNT = 10;
export const MIN_VOCABULARY_ITEM_COUNT = 1;
export const MAX_VOCABULARY_ITEM_COUNT = 20;

export function isValidVocabularyItemCount(value: unknown): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= MIN_VOCABULARY_ITEM_COUNT
    && value <= MAX_VOCABULARY_ITEM_COUNT;
}
