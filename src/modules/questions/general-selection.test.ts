import { describe, expect, it } from "vitest";
import { selectGeneralQuestions } from "./general-selection";

const candidates = Array.from({ length: 7 }, (_, index) => ({
  id: `q${index + 1}`,
  code: `Q${index + 1}`,
  topicId: "travel",
  difficulty: "BEGINNER" as const,
  lastAnsweredAt: index < 2 ? `2026-08-${10 + index}T00:00:00Z` : null,
}));

describe("selectGeneralQuestions", () => {
  it("selects five unique unseen questions first", () => {
    expect(selectGeneralQuestions(candidates, ["q1", "q2"], 5).map((item) => item.id))
      .toEqual(["q3", "q4", "q5", "q6", "q7"]);
  });

  it("falls back to least recently answered questions", () => {
    expect(selectGeneralQuestions(candidates.slice(0, 6), ["q1", "q2"], 5).map((item) => item.id))
      .toEqual(["q3", "q4", "q5", "q6", "q1"]);
  });

  it("supports a custom question count", () => {
    expect(selectGeneralQuestions(candidates, [], 3).map((item) => item.id))
      .toEqual(["q1", "q2", "q3"]);
  });

  it("fails when fewer eligible candidates exist than requested", () => {
    expect(() => selectGeneralQuestions(candidates.slice(0, 4), [], 5))
      .toThrow("Not enough active questions for this topic; need 5, found 4");
  });
});
