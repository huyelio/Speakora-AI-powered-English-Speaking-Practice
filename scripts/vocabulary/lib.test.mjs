import { describe, expect, it } from "vitest";
import {
  balanceAccepted,
  buildSenseEmbedText,
  cosineSimilarity,
  isActiveGeneralTopic,
  normalizeCandidate,
  rankTopicMatches,
  shouldAutoAccept,
} from "./lib.mjs";

describe("vocabulary pipeline helpers", () => {
  it("normalizes a valid SkyPedia sense candidate", () => {
    expect(normalizeCandidate({
      source_sense_id: "wd-1",
      word: " Demand ",
      meaning_vi: "Nhu cầu",
      example_sentence: "There is growing demand.",
      pronunciation_ipa: "/dɪˈmɑːnd/",
      pos: "N",
    })).toEqual({
      source_sense_id: "wd-1",
      word: "demand",
      meaning_vi: "Nhu cầu",
      example_sentence: "There is growing demand.",
      pronunciation_ipa: "/dɪˈmɑːnd/",
      pos: "N",
    });
  });

  it("rejects incomplete candidates", () => {
    expect(normalizeCandidate({ word: "x", meaning_vi: "", example_sentence: "y", source_sense_id: "1" })).toBeNull();
  });

  it("ranks topic matches by cosine similarity and computes margin", () => {
    const topics = [
      { id: "work", slug: "work", name: "Work", difficulty_level: "INTERMEDIATE", embedding: [1, 0, 0] },
      { id: "tech", slug: "technology", name: "Technology", difficulty_level: "INTERMEDIATE", embedding: [0, 1, 0] },
    ];
    const ranked = rankTopicMatches([0.9, 0.1, 0], topics);
    expect(ranked.top1.slug).toBe("work");
    expect(ranked.margin).toBeGreaterThan(0);
  });

  it("auto-accepts only confident mappings", () => {
    expect(shouldAutoAccept(0.4, 0.1)).toBe(true);
    expect(shouldAutoAccept(0.2, 0.1)).toBe(false);
    expect(shouldAutoAccept(0.4, 0.01)).toBe(false);
  });

  it("validates active General topics", () => {
    expect(isActiveGeneralTopic({ is_active: true, mode_id: "g1" }, "g1")).toBe(true);
    expect(isActiveGeneralTopic({ is_active: true, mode_id: "other" }, "g1")).toBe(false);
  });

  it("builds sense embed text from word sense fields", () => {
    expect(buildSenseEmbedText({
      word: "application",
      meaning_vi: "ứng dụng phần mềm",
      example_sentence: "Open the application.",
      pos: "N",
    })).toContain("ứng dụng phần mềm");
  });

  it("balances accepted items across topics", () => {
    const accepted = [
      { topic_id: "a", word: "a1" },
      { topic_id: "a", word: "a2" },
      { topic_id: "a", word: "a3" },
      { topic_id: "b", word: "b1" },
      { topic_id: "b", word: "b2" },
    ];
    const balanced = balanceAccepted(accepted, 4, 2);
    expect(balanced).toHaveLength(4);
    expect(balanced.filter((item) => item.topic_id === "a")).toHaveLength(2);
    expect(balanced.filter((item) => item.topic_id === "b")).toHaveLength(2);
  });

  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
