import { describe, expect, it } from "vitest";
import { buildFirstLetterHint } from "./types";
import { selectVocabularyItems } from "./selection";

describe("buildFirstLetterHint", () => {
  it("builds a first-letter underscore hint from the word", () => {
    expect(buildFirstLetterHint("demand")).toBe("D_____");
    expect(buildFirstLetterHint("make progress")).toBe("M___________");
  });
});

describe("selectVocabularyItems", () => {
  it("selects unique items without replacement", () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({
      id: `id-${index}`,
      word: `word-${index}`,
    }));
    const selected = selectVocabularyItems(candidates, 3, () => 0);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((item) => item.id)).size).toBe(3);
  });

  it("throws when there are not enough candidates", () => {
    expect(() => selectVocabularyItems([{ id: "a", word: "a" }], 2)).toThrow(/Need 2/);
  });
});
