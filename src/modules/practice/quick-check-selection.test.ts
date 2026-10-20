import { expect, it } from "vitest";
import { selectQuickCheckQuestions } from "./quick-check-selection";
import type { GeneralCandidate } from "../questions/general-selection";
const candidate = (code: string, difficulty: GeneralCandidate["difficulty"]): GeneralCandidate => ({ id: code, code, difficulty, topicId: "topic-1", lastAnsweredAt: null });
const bank = [
  candidate("GENERAL_DAILY_ROUTINE_I_005", "INTERMEDIATE"),
  candidate("GENERAL_DAILY_ROUTINE_B_002", "BEGINNER"),
  candidate("GENERAL_DAILY_ROUTINE_I_001", "INTERMEDIATE"),
  candidate("GENERAL_DAILY_ROUTINE_B_001", "BEGINNER"),
];
it("selects fixed warmup, topic, opinion questions in order regardless of bank order", () => {
  expect(selectQuickCheckQuestions(bank).map((q) => q.code)).toEqual([
    "GENERAL_DAILY_ROUTINE_B_001", "GENERAL_DAILY_ROUTINE_I_001", "GENERAL_DAILY_ROUTINE_I_005",
  ]);
});
it("rejects a bank missing a required active slot rather than inventing a prompt", () => {
  expect(() => selectQuickCheckQuestions(bank.slice(1))).toThrow("Quick check");
});
it("rejects mixed topics", () => {
  expect(() => selectQuickCheckQuestions(bank.map((q, i) => ({ ...q, topicId: i ? "topic-1" : "other" })))).toThrow("Quick check");
});
