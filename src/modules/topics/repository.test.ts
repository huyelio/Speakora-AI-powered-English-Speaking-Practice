import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { filterActiveGeneralQuestionRows } from "./repository";

const generalModeId = "mode-general";

function questionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "question-1",
    code: "GENERAL_TRAVEL_B_001",
    topic_id: "topic-travel",
    difficulty_level: "BEGINNER",
    status: "ACTIVE",
    topics: {
      id: "topic-travel",
      slug: "travel",
      name: "Travel",
      mode_id: generalModeId,
      is_active: true,
    },
    practice_modes: {
      id: generalModeId,
      code: "GENERAL",
      is_active: true,
    },
    question_types: { is_active: true },
    ...overrides,
  };
}

describe("filterActiveGeneralQuestionRows", () => {
  it("rejects a question whose active topic belongs to another mode", () => {
    const rows = filterActiveGeneralQuestionRows(
      [questionRow({ topics: { id: "topic-travel", slug: "travel", name: "Travel", mode_id: "mode-ielts", is_active: true } })],
      generalModeId,
    );

    expect(rows).toEqual([]);
  });

  it("rejects an unsupported database difficulty before mapping to LearnerLevel", () => {
    const rows = filterActiveGeneralQuestionRows(
      [questionRow({ difficulty_level: "EXPERT" })],
      generalModeId,
    );

    expect(rows).toEqual([]);
  });
});
