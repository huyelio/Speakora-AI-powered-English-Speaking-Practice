import { expect, it } from "vitest";
import { conversationStars, conversationStats, parseConversationAssessment } from "./assessment";

const criterion = { level: "GOOD", summary: "Tốt.", example: null };
const valid = {
  overall_feedback: "Bạn giữ được cuộc trò chuyện.",
  criteria: { fluency_coherence: criterion, lexical_resource: criterion, grammatical_range_accuracy: criterion, interaction: criterion },
  rewrites: [{ original: "I’m go to Da Nang", natural: "I'm going to Da Nang." }],
  useful_phrases: ["I can't wait to ___."],
};

it("accepts feedback whose quotes come from the learner, ignoring case, spacing and curly apostrophes", () => {
  expect(parseConversationAssessment(valid, ["I'm go  to da nang for a wedding."]).rewrites).toHaveLength(1);
});

it("rejects quotes that are not in the learner's turns, unknown levels and oversized lists", () => {
  expect(() => parseConversationAssessment(valid, ["Something else."])).toThrow("not found");
  expect(() => parseConversationAssessment({ ...valid, criteria: { ...valid.criteria, interaction: { ...criterion, level: "BAND_7" } } }, ["I'm go to Da Nang"])).toThrow();
  expect(() => parseConversationAssessment({ ...valid, useful_phrases: ["a", "b", "c", "d", "e"] }, ["I'm go to Da Nang"])).toThrow();
  expect(() => parseConversationAssessment({ ...valid, criteria: { ...valid.criteria, interaction: undefined } }, ["I'm go to Da Nang"])).toThrow();
});

it("derives stars from goals and needs three learner turns", () => {
  expect(conversationStars(2, 2, 3)).toBe(3);
  expect(conversationStars(1, 2, 5)).toBe(2);
  expect(conversationStars(1, 3, 5)).toBe(1);
  expect(conversationStars(0, 2, 4)).toBe(1);
  expect(conversationStars(2, 2, 2)).toBe(0);
});

it("counts learner turns, average words and questions without a model", () => {
  expect(conversationStats([
    { role: "assistant", content: "Hi! Where to?" },
    { role: "user", content: "To Hue, for work." },
    { role: "user", content: "And you, where are you going?" },
  ])).toEqual({ turns: 2, averageWords: 5, questions: 1 });
});
