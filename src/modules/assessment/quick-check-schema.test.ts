import { expect, it } from "vitest";
import { parseQuickCheckOutput } from "./quick-check-schema";

const output = { estimated_cefr: "B1", feedback: "Clear ideas.", recommendation: "Expand your answers." };
it("accepts a compact CEFR estimate", () => {
  expect(parseQuickCheckOutput(output)).toEqual(output);
});
it.each([
  { ...output, estimated_cefr: "B3" },
  { ...output, score: 70 },
  { ...output, criteria: {} },
  { ...output, feedback: " " },
  { ...output, recommendation: "x".repeat(501) },
  { feedback: "Clear ideas.", recommendation: "Practice." },
])("rejects unsupported, expanded, or empty quick check output %j", (value) => {
  expect(() => parseQuickCheckOutput(value)).toThrow("Invalid Quick Check output");
});
