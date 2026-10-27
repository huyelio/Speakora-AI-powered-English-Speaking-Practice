import { describe, expect, it } from "vitest";
import type { LearnerLevel } from "../profile/types";
import { EMPTY_EVIDENCE } from "./rules";
import { buildTopicProgress, chooseTopicAction, chooseTopicLevel, topicStatusLine, type TopicWordRow } from "./topic-progress";
import type { LearningEvidence } from "./types";

const weak: LearningEvidence = { ...EMPTY_EVIDENCE, latestReview: "NOT_REMEMBERED", lastPracticedAt: "2026-10-01" };
const learning: LearningEvidence = { ...EMPTY_EVIDENCE, recalls: [true], lastPracticedAt: "2026-10-02" };
const mastered: LearningEvidence = { ...EMPTY_EVIDENCE, latestReview: "REMEMBERED", recalls: [true, true], pronunciation: "GOOD" };

function row(id: string, topic: string, level: LearnerLevel = "BEGINNER"): TopicWordRow {
  return { id, topicId: topic, topicSlug: topic, topicName: topic, level, word: id, ipa: `/${id}/`, meaningVi: id };
}

describe("chooseTopicLevel", () => {
  it("prefers the profile level when the topic has words at it", () => {
    expect(chooseTopicLevel(new Map([["BEGINNER", 8], ["INTERMEDIATE", 2]]), "INTERMEDIATE")).toBe("INTERMEDIATE");
  });

  it("otherwise picks the level with most words, lower level on ties", () => {
    expect(chooseTopicLevel(new Map([["INTERMEDIATE", 10]]), "BEGINNER")).toBe("INTERMEDIATE");
    expect(chooseTopicLevel(new Map([["BEGINNER", 5], ["ADVANCED", 5]]), null)).toBe("BEGINNER");
    expect(chooseTopicLevel(new Map(), null)).toBeNull();
  });
});

describe("chooseTopicAction", () => {
  it("resumes an unfinished session first", () => {
    expect(chooseTopicAction([{ id: "a", evidence: EMPTY_EVIDENCE }], "s1")).toEqual({ kind: "resume", sessionId: "s1" });
  });

  it("counts review and new words in the next six, like session creation", () => {
    const words = [
      ...["w1", "w2"].map(id => ({ id, evidence: weak })),
      { id: "l1", evidence: learning },
      ...["n1", "n2", "n3", "n4", "n5"].map(id => ({ id, evidence: EMPTY_EVIDENCE })),
      { id: "m1", evidence: mastered },
    ];
    expect(chooseTopicAction(words, null)).toEqual({ kind: "learn", count: 6, review: 3, fresh: 3 });
  });

  it("offers mastered review when nothing else is left", () => {
    expect(chooseTopicAction([{ id: "m1", evidence: mastered }, { id: "m2", evidence: mastered }], null))
      .toEqual({ kind: "review-mastered", count: 2 });
  });
});

describe("buildTopicProgress", () => {
  it("scopes words to the chosen level and counts states", () => {
    const [topic] = buildTopicProgress(
      [row("b1", "travel"), row("b2", "travel"), row("i1", "travel", "INTERMEDIATE")],
      { b1: weak, b2: mastered },
      null,
      {},
    );
    expect(topic.level).toBe("BEGINNER");
    expect(topic.counts).toEqual({ NEW: 0, LEARNING: 0, WEAK: 1, MASTERED: 1, total: 2 });
    expect(topic.words.map(word => word.id)).toEqual(["b1", "b2"]);
  });

  it("orders resume, weak, profile level, then name", () => {
    const topics = buildTopicProgress(
      [row("a1", "alpha"), row("b1", "beta", "INTERMEDIATE"), row("c1", "gamma"), row("d1", "delta")],
      { c1: weak },
      "INTERMEDIATE",
      { delta: "s1" },
    );
    expect(topics.map(topic => topic.slug)).toEqual(["delta", "gamma", "beta", "alpha"]);
  });
});

describe("topicStatusLine", () => {
  it("names the most useful next fact", () => {
    expect(topicStatusLine({ NEW: 10, LEARNING: 0, WEAK: 0, MASTERED: 0, total: 10 })).toBe("10 từ mới");
    expect(topicStatusLine({ NEW: 4, LEARNING: 2, WEAK: 2, MASTERED: 2, total: 10 })).toBe("2 từ cần ôn");
    expect(topicStatusLine({ NEW: 0, LEARNING: 3, WEAK: 0, MASTERED: 7, total: 10 })).toBe("3 từ đang học");
    expect(topicStatusLine({ NEW: 0, LEARNING: 0, WEAK: 0, MASTERED: 10, total: 10 })).toBe("Đã thuộc hết");
  });
});
