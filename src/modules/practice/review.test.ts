import { describe, expect, it } from "vitest";
import { mapReviewRows } from "./review";

describe("mapReviewRows", () => {
  it("returns ordered original questions, transcripts, and authorized audio endpoints", () => {
    const result = mapReviewRows("session-1", [
      {
        id: "sq-1",
        sequence_no: 1,
        prompt_snapshot: { question_type: "IELTS_PART_1", prompt_text: "Do you work or study?" },
        user_answers: [{ id: "answer-1", transcripts: [{ text: "I am currently a student." }] }],
      },
    ]);

    expect(result).toEqual([
      {
        sessionQuestionId: "sq-1",
        answerId: "answer-1",
        sequenceNo: 1,
        questionType: "IELTS_PART_1",
        promptText: "Do you work or study?",
        transcript: "I am currently a student.",
        audioUrl: "/api/practice/sessions/session-1/answers/answer-1/audio",
      },
    ]);
  });
});
