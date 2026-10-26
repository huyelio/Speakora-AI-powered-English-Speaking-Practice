import { describe, expect, it } from "vitest";
import { parseTopicSlug, parseVocabularyMode, vocabularyHref } from "./hub-model";

describe("vocabulary hub model", () => {
  it("accepts only the three hub modes", () => {
    expect(parseVocabularyMode("learn")).toBe("learn");
    expect(parseVocabularyMode(["pronounce", "review"])).toBe("pronounce");
    expect(parseVocabularyMode("REVIEW")).toBeNull();
    expect(parseVocabularyMode(undefined)).toBeNull();
  });

  it("keeps a well-formed topic slug for preselection", () => {
    expect(parseTopicSlug("food-and-cooking")).toBe("food-and-cooking");
    expect(parseTopicSlug(" travel ")).toBe("travel");
    expect(parseTopicSlug("<script>")).toBeUndefined();
    expect(parseTopicSlug("")).toBeUndefined();
  });

  it("builds hub URLs that preserve the selected topic", () => {
    expect(vocabularyHref(null)).toBe("/vocabulary");
    expect(vocabularyHref("learn", "travel")).toBe("/vocabulary?mode=learn&topic=travel");
    expect(vocabularyHref(null, "travel")).toBe("/vocabulary?topic=travel");
  });
});
