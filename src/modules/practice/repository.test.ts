import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGeneralQuestionCandidates, getSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  getGeneralQuestionCandidates: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../topics/repository", () => ({ getGeneralQuestionCandidates }));

import { createGeneralPracticeSession } from "./repository";

describe("createGeneralPracticeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseAdminClient.mockReturnValue({ rpc });
  });

  it("selects unseen then least-recently answered candidates before the atomic RPC", async () => {
    getGeneralQuestionCandidates.mockResolvedValue({
      candidates: [
        candidate("q1", "2026-08-20T00:00:00Z"),
        candidate("q2", "2026-08-21T00:00:00Z"),
        candidate("q3", null),
        candidate("q4", null),
        candidate("q5", null),
        candidate("q6", null),
      ],
      recentQuestionIds: ["q1", "q2"],
    });
    rpc.mockResolvedValue({
      data: ["q3", "q4", "q5", "q6", "q1"].map((id, index) => ({
        session_id: "session-1",
        session_question_id: `sq-${index + 1}`,
        sequence_no: index + 1,
        prompt_snapshot: {
          id,
          code: id.toUpperCase(),
          prompt_text: `Prompt ${id}`,
          instruction_text: null,
          prep_seconds: 0,
          answer_seconds: 60,
          question_type: "GENERAL_OPEN_TOPIC",
          topic: { slug: "travel", name: "Travel" },
          prompt_items: [],
        },
      })),
      error: null,
    });

    const result = await createGeneralPracticeSession("user-1", "topic-1", "BEGINNER");

    expect(getGeneralQuestionCandidates).toHaveBeenCalledWith("user-1", "topic-1", "BEGINNER");
    expect(rpc).toHaveBeenCalledWith("create_general_practice_session", {
      p_user_id: "user-1",
      p_topic_id: "topic-1",
      p_difficulty: "BEGINNER",
      p_question_ids: ["q3", "q4", "q5", "q6", "q1"],
    });
    expect(result).toMatchObject({
      sessionId: "session-1",
      topic: { slug: "travel", name: "Travel" },
    });
    expect(result.questions.map((question) => question.id)).toEqual(["q3", "q4", "q5", "q6", "q1"]);
  });
});

function candidate(id: string, lastAnsweredAt: string | null) {
  return {
    id,
    code: id.toUpperCase(),
    topicId: "topic-1",
    difficulty: "BEGINNER",
    lastAnsweredAt,
  };
}
