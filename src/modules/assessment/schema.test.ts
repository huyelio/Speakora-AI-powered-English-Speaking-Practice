import { describe, expect, it } from "vitest";
import { parseAssessmentOutput } from "./schema";

const valid = {
  estimated_band: 6.5,
  overall_feedback: "Bạn phát triển ý khá rõ ràng.",
  criteria: {
    fluency_coherence: {
      summary: "Các ý nhìn chung mạch lạc, nhưng liên kết còn lặp.",
      example: null,
    },
    lexical_resource: {
      summary: "Từ vựng phù hợp nhưng phạm vi còn hạn chế.",
      example: { original: "very good", corrected: "highly beneficial" },
    },
    grammatical_range_accuracy: {
      summary: "Có lỗi chia động từ.",
      example: { original: "Some people prefers", corrected: "Some people prefer" },
    },
  },
  strengths: ["Trả lời đúng trọng tâm."],
  improvements: ["Mở rộng ví dụ cụ thể."],
  next_steps: ["Luyện nối ý trong câu trả lời Part 3."],
};

describe("parseAssessmentOutput", () => {
  it("accepts schema-valid transcript-based qualitative criteria", () => {
    expect(parseAssessmentOutput(valid, "It is very good. Some people prefers city life.")).toEqual(valid);
  });

  it("rejects criterion evidence that was not copied from the transcript", () => {
    expect(() => parseAssessmentOutput(valid, "This transcript contains no quoted examples.")).toThrow(
      "not found in transcript",
    );
  });

  it("allows at most one optional example per criterion", () => {
    expect(() => parseAssessmentOutput({
      ...valid,
      criteria: {
        ...valid.criteria,
        lexical_resource: { ...valid.criteria.lexical_resource, examples: [] },
      },
    }, "very good Some people prefers")).toThrow("examples");
  });

  it("rejects invalid band increments and missing qualitative criteria", () => {
    expect(() => parseAssessmentOutput({ ...valid, estimated_band: 6.3 })).toThrow();
    expect(() => parseAssessmentOutput({ ...valid, criteria: {} })).toThrow();
  });

  it("rejects pronunciation scoring or feedback from the transcript-only assessment", () => {
    expect(() =>
      parseAssessmentOutput({
        ...valid,
        criteria: { ...valid.criteria, pronunciation: 7 },
      }),
    ).toThrow("pronunciation");
    expect(() => parseAssessmentOutput({ ...valid, pronunciation_score: 7 })).toThrow("pronunciation_score");
  });

  it("rejects unrecognized top-level and criterion properties", () => {
    expect(() => parseAssessmentOutput({ ...valid, evidence: [] })).toThrow("evidence");
    expect(() => parseAssessmentOutput({
      ...valid,
      criteria: { ...valid.criteria, fluency_score: 6.5 },
    })).toThrow("fluency_score");
  });
});
