import { describe, expect, it } from "vitest";
import { parseGeneralAssessmentOutput } from "./general-schema";

const valid = {
  overall_feedback: "Bạn truyền đạt ý rõ ràng.",
  criteria: {
    fluency_coherence: { summary: "Mạch ý dễ theo dõi.", example: null },
    lexical_resource: {
      summary: "Từ vựng phù hợp.",
      example: { original: "I work in a small team", corrected: null },
    },
    grammatical_range_accuracy: {
      summary: "Câu đơn chính xác.",
      example: { original: "She go to work", corrected: "She goes to work" },
    },
  },
  strengths: ["Trả lời đúng trọng tâm"],
  improvements: ["Mở rộng lý do"],
  next_steps: ["Luyện chủ đề Work"],
  useful_phrase: "From my point of view, ...",
  recommendation_tags: ["WORK", "VOCABULARY"],
};

describe("parseGeneralAssessmentOutput", () => {
  it("accepts the exact General contract with transcript-backed evidence", () => {
    expect(parseGeneralAssessmentOutput(
      valid,
      "I work in a small team. She go to work every day.",
    )).toEqual(valid);
  });

  it("rejects IELTS, pronunciation, and other unexpected fields", () => {
    expect(() => parseGeneralAssessmentOutput({ ...valid, estimated_band: 6.5 })).toThrow("unexpected property");
    expect(() => parseGeneralAssessmentOutput({ ...valid, pronunciation: "good" })).toThrow("unexpected property");
    expect(() => parseGeneralAssessmentOutput({ ...valid, evidence: [] })).toThrow("unexpected property");
  });

  it("rejects criterion evidence absent from the transcripts", () => {
    expect(() => parseGeneralAssessmentOutput(valid, "Unrelated transcript.")).toThrow("not found in transcript");
  });

  it("limits useful phrases and recommendation tags to the known contract", () => {
    expect(() => parseGeneralAssessmentOutput({ ...valid, useful_phrase: "x".repeat(161) })).toThrow();
    expect(() => parseGeneralAssessmentOutput({ ...valid, recommendation_tags: ["WORK", "INVENTED"] })).toThrow();
  });
});
