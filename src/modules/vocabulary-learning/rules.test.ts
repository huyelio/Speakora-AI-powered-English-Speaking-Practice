import { describe, expect, it } from "vitest";
import { checkAnswer, contextPrompt, deriveState, selectItems, selectContext, hasImproved } from "./rules";
import type { LearningEvidence } from "./types";

const fresh: LearningEvidence = { latestReview: null, recalls: [], pronunciation: "UNASSESSED", lastPracticedAt: null };
describe("learning evidence", () => {
  it("does not grant mastery for legacy self reviews or absent pronunciation", () => {
    expect(deriveState(fresh)).toBe("NEW");
    expect(deriveState({ ...fresh, latestReview: "REMEMBERED" })).toBe("LEARNING");
    expect(deriveState({ ...fresh, pronunciation: "UNKNOWN" })).toBe("LEARNING");
    expect(deriveState({ ...fresh, recalls: [true, true] })).toBe("LEARNING");
    expect(deriveState({ ...fresh, recalls: [true, true], pronunciation: "GOOD" })).toBe("MASTERED");
  });
  it("latest failures take precedence over past success", () => {
    expect(deriveState({ ...fresh, latestReview: "NOT_REMEMBERED", recalls: [true, true], pronunciation: "GOOD" })).toBe("WEAK");
    expect(deriveState({ ...fresh, pronunciation: "WEAK" })).toBe("WEAK");
    expect(deriveState({ ...fresh, recalls: [true, false], pronunciation: "GOOD" })).toBe("LEARNING");
  });
  it("recognizes improvement in pronunciation while recall remains weak", () => {
    expect(hasImproved({ ...fresh, latestReview: "NOT_REMEMBERED", pronunciation: "WEAK" }, { ...fresh, latestReview: "NOT_REMEMBERED", pronunciation: "GOOD" })).toBe(true);
  });
});
describe("selection and answers", () => {
  it("prioritizes weak then learning then new, omitting mastered", () => {
    const candidates = [
      { id: "new", evidence: fresh },
      { id: "mastered", evidence: { ...fresh, pronunciation: "GOOD" as const, recalls: [true, true] } },
      { id: "learning", evidence: { ...fresh, latestReview: "REMEMBERED" as const } },
      { id: "weak-newer", evidence: { ...fresh, pronunciation: "WEAK" as const, lastPracticedAt: "2026-10-23" } },
      { id: "weak-older", evidence: { ...fresh, pronunciation: "WEAK" as const, lastPracticedAt: "2026-10-20" } },
    ];
    expect(selectItems(candidates).map(x => x.id)).toEqual(["weak-older", "weak-newer", "learning", "new"]);
    expect(selectItems(candidates, true).map(x => x.id)).toEqual(["mastered"]);
    expect(selectItems(Array.from({ length: 9 }, (_, i) => ({ id: String(i), evidence: fresh })))).toHaveLength(6);
  });
  it("checks trimmed case-insensitive exact answers only", () => {
    expect(checkAnswer(" \tTRAVEL\n", "travel")).toBe(true);
    expect(checkAnswer("travelled", "travel")).toBe(false);
    expect(checkAnswer("ice  cream", "ice cream")).toBe(false);
  });
  it.each([
    ["art", "Art is art, not party.", "_____ is _____, not party."],
    ["travel", "We travelled.", null],
    ["C++", "I use C++ daily.", "I use _____ daily."],
    ["ice cream", "Ice cream is nice.", "_____ is nice."],
    ["", "A sentence", null],
  ])("builds literal context for %s", (word, sentence, expected) => {
    expect(contextPrompt(word, sentence)).toBe(expected);
  });
  it("selects at most three usable contexts, recall failures first", () => {
    expect(selectContext([
      { id: "a", prompt: "a", recallWrong: false, pronunciationWeak: false },
      { id: "b", prompt: "b", recallWrong: false, pronunciationWeak: true },
      { id: "c", prompt: "c", recallWrong: true, pronunciationWeak: false },
      { id: "d", prompt: null, recallWrong: true, pronunciationWeak: true },
      { id: "e", prompt: "e", recallWrong: false, pronunciationWeak: false },
    ])).toEqual(["c", "b", "a"]);
  });
});
