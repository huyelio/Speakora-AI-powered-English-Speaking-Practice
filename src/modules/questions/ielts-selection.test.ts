import { describe, expect, it } from "vitest";
import {
  selectIeltsSessionQuestions,
  type IeltsQuestionCandidate,
} from "./ielts-selection";

const candidate = (
  id: string,
  questionType: IeltsQuestionCandidate["questionType"],
  options: Partial<IeltsQuestionCandidate> = {},
): IeltsQuestionCandidate => ({
  id,
  code: `IELTS_T99_${id}`,
  questionType,
  groupId: null,
  topicId: null,
  ...options,
});

describe("selectIeltsSessionQuestions", () => {
  it("returns two Part 1, one Part 2, and two Part 3 questions in IELTS order without duplicates", () => {
    const selected = selectIeltsSessionQuestions(
      [
        candidate("p1-a", "IELTS_PART_1"),
        candidate("p1-b", "IELTS_PART_1"),
        candidate("p1-c", "IELTS_PART_1"),
        candidate("p2", "IELTS_PART_2_CUE_CARD"),
        candidate("p3-a", "IELTS_PART_3"),
        candidate("p3-b", "IELTS_PART_3"),
        candidate("p3-c", "IELTS_PART_3"),
      ],
      () => 0,
    );

    expect(selected.map((question) => question.questionType)).toEqual([
      "IELTS_PART_1",
      "IELTS_PART_1",
      "IELTS_PART_2_CUE_CARD",
      "IELTS_PART_3",
      "IELTS_PART_3",
    ]);
    expect(new Set(selected.map((question) => question.id)).size).toBe(5);
  });

  it("prefers Part 3 questions related to Part 2 by group before other relationships", () => {
    const selected = selectIeltsSessionQuestions(
      [
        candidate("p1-a", "IELTS_PART_1"),
        candidate("p1-b", "IELTS_PART_1"),
        candidate("p2", "IELTS_PART_2_CUE_CARD", { groupId: "group-a", topicId: "topic-a", code: "IELTS_T01_P2_001" }),
        candidate("group-1", "IELTS_PART_3", { groupId: "group-a" }),
        candidate("group-2", "IELTS_PART_3", { groupId: "group-a" }),
        candidate("topic", "IELTS_PART_3", { topicId: "topic-a" }),
        candidate("test", "IELTS_PART_3", { code: "IELTS_T01_P3_001" }),
      ],
      () => 0,
    );

    expect(selected.slice(3).map((question) => question.id)).toEqual(["group-1", "group-2"]);
  });

  it("uses same test-set Part 3 questions and safely fills missing related slots", () => {
    const selected = selectIeltsSessionQuestions(
      [
        candidate("p1-a", "IELTS_PART_1"),
        candidate("p1-b", "IELTS_PART_1"),
        candidate("p2", "IELTS_PART_2_CUE_CARD", { code: "IELTS_T03_P2_003" }),
        candidate("related", "IELTS_PART_3", { code: "IELTS_T03_P3_021" }),
        candidate("fallback", "IELTS_PART_3", { code: "IELTS_T04_P3_031" }),
      ],
      () => 0,
    );

    expect(selected.slice(3).map((question) => question.id)).toEqual(["related", "fallback"]);
  });

  it("fails without creating a partial selection when a required part is undersupplied", () => {
    expect(() =>
      selectIeltsSessionQuestions([
        candidate("p1", "IELTS_PART_1"),
        candidate("p2", "IELTS_PART_2_CUE_CARD"),
        candidate("p3-a", "IELTS_PART_3"),
        candidate("p3-b", "IELTS_PART_3"),
      ]),
    ).toThrow("Not enough active IELTS questions");
  });
});
