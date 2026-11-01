import { describe, expect, it } from "vitest";
import { validateImportRow } from "./import-vocabulary.mjs";

describe("validateImportRow", () => {
  const generalModeId = "mode-general";
  const topic = {
    id: "topic-work",
    slug: "work",
    is_active: true,
    mode_id: generalModeId,
  };
  const topicById = new Map([[topic.id, topic]]);
  const topicBySlug = new Map([[topic.slug, topic]]);

  it("accepts a row mapped by topic_slug", () => {
    const result = validateImportRow(
      {
        word: "deadline",
        meaning_vi: "hạn chót",
        example_sentence: "We have a deadline.",
        level: "INTERMEDIATE",
        topic_slug: "work",
        source: "mvp-sample",
        source_ref: "work:deadline:1",
      },
      topicById,
      topicBySlug,
      generalModeId,
    );
    expect(result.errors).toEqual([]);
    expect(result.topicId).toBe("topic-work");
  });

  it("rejects an unknown CEFR label", () => {
    const result = validateImportRow(
      {
        word: "deadline",
        meaning_vi: "hạn chót",
        example_sentence: "We have a deadline.",
        level: "INTERMEDIATE",
        cefr_level: "D1",
        topic_slug: "work",
        source: "speakora-ai",
        source_ref: "work:deadline",
      },
      topicById,
      topicBySlug,
      generalModeId,
    );
    expect(result.errors).toContain("cefr_level must be A1, A2, B1, B2, C1, or C2");
  });

  it("rejects inactive or non-general topics", () => {
    const inactive = new Map([["x", { id: "x", slug: "work", is_active: false, mode_id: generalModeId }]]);
    const result = validateImportRow(
      {
        word: "deadline",
        meaning_vi: "hạn chót",
        example_sentence: "We have a deadline.",
        level: "INTERMEDIATE",
        topic_id: "x",
        source: "mvp-sample",
        source_ref: "work:deadline:1",
      },
      inactive,
      new Map(),
      generalModeId,
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
