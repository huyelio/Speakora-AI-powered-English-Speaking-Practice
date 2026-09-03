import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapAssessmentRow } from "./repository";

const criterion = {
  summary: "Bạn dùng ý rõ ràng.",
  example: { original: "I travel by train.", corrected: null },
};

function generalRow() {
  return {
    assessment_mode: "GENERAL" as const,
    estimated_band: null,
    overall_feedback: "Bạn giao tiếp rõ ràng.",
    strengths: ["Ý chính dễ hiểu"],
    improvements: ["Nối ý tự nhiên hơn"],
    next_steps: ["Luyện thêm câu nối"],
    raw_output: {
      overall_feedback: "Bạn giao tiếp rõ ràng.",
      criteria: {
        fluency_coherence: criterion,
        lexical_resource: criterion,
        grammatical_range_accuracy: criterion,
      },
      strengths: ["Ý chính dễ hiểu"],
      improvements: ["Nối ý tự nhiên hơn"],
      next_steps: ["Luyện thêm câu nối"],
      useful_phrase: "One thing I really enjoy is…",
      recommendation_tags: ["TRAVEL"],
    },
  };
}

it("maps the General result without inventing an IELTS band", () => {
  const result = mapAssessmentRow("GENERAL", generalRow());

  expect(result).toMatchObject({
    mode: "GENERAL",
    usefulPhrase: "One thing I really enjoy is…",
    recommendationTags: ["TRAVEL"],
    criteria: { fluencyCoherence: criterion },
  });
  expect("estimatedBand" in result).toBe(false);
});

it("rejects a stored assessment whose authoritative mode disagrees with its session", () => {
  expect(() => mapAssessmentRow("IELTS", generalRow()))
    .toThrow("Assessment mode does not match session mode");
});

it("rejects malformed stored assessment output instead of manufacturing display values", () => {
  const malformed = generalRow();
  malformed.raw_output.useful_phrase = "";

  expect(() => mapAssessmentRow("GENERAL", malformed))
    .toThrow("Invalid General assessment output");
});
