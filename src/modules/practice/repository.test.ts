import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGeneralQuestionCandidates, getSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  getGeneralQuestionCandidates: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../topics/repository", () => ({ getGeneralQuestionCandidates }));

import {
  createGeneralPracticeSession,
  InsufficientTopicQuestionsError,
  mapClientPracticeSession,
} from "./repository";

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

    const result = await createGeneralPracticeSession("user-1", "topic-1", 5);

    expect(getGeneralQuestionCandidates).toHaveBeenCalledWith("user-1", "topic-1");
    expect(rpc).toHaveBeenCalledWith("create_general_practice_session", {
      p_user_id: "user-1",
      p_topic_id: "topic-1",
      p_question_ids: ["q3", "q4", "q5", "q6", "q1"],
    });
    expect(result).toMatchObject({
      sessionId: "session-1",
      topic: { slug: "travel", name: "Travel" },
    });
    expect(result.questions.map((question) => question.id)).toEqual(["q3", "q4", "q5", "q6", "q1"]);
  });

  it("passes a custom questionCount through selection and RPC", async () => {
    getGeneralQuestionCandidates.mockResolvedValue({
      candidates: [
        candidate("q1", null),
        candidate("q2", null),
        candidate("q3", null),
      ],
      recentQuestionIds: [],
    });
    rpc.mockResolvedValue({
      data: ["q1", "q2", "q3"].map((id, index) => ({
        session_id: "session-2",
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

    await createGeneralPracticeSession("user-1", "topic-1", 3);

    expect(rpc).toHaveBeenCalledWith("create_general_practice_session", {
      p_user_id: "user-1",
      p_topic_id: "topic-1",
      p_question_ids: ["q1", "q2", "q3"],
    });
  });

  it("throws InsufficientTopicQuestionsError when the topic cannot fill the request", async () => {
    getGeneralQuestionCandidates.mockResolvedValue({
      candidates: [candidate("q1", null), candidate("q2", null)],
      recentQuestionIds: [],
    });

    await expect(createGeneralPracticeSession("user-1", "topic-1", 5)).rejects.toBeInstanceOf(
      InsufficientTopicQuestionsError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

it("recovers the first unanswered ordered question when durable answers contain a hole", () => {
  const session = {
    id: "session-1",
    status: "IN_PROGRESS",
    mode: "GENERAL",
    userId: "user-1",
    guestTokenHash: null,
    questionCount: 2,
    topicId: "topic-1",
    difficulty: "BEGINNER",
  } as const;
  const dto = mapClientPracticeSession(session, [
    sessionQuestion(2, [{ id: "answer-2" }]),
    sessionQuestion(1, []),
  ]);

  expect(dto.questions.map((question) => question.sequenceNo)).toEqual([1, 2]);
  expect(dto.currentQuestionIndex).toBe(0);
});

it("advances past an already answered later question after filling an earlier hole", () => {
  const session = {
    id: "session-1",
    status: "IN_PROGRESS",
    mode: "GENERAL",
    userId: "user-1",
    guestTokenHash: null,
    questionCount: 3,
    topicId: "topic-1",
    difficulty: "BEGINNER",
  } as const;
  const dto = mapClientPracticeSession(session, [
    sessionQuestion(3, []),
    sessionQuestion(1, [{ id: "answer-1" }]),
    sessionQuestion(2, [{ id: "answer-2" }]),
  ]);

  expect(dto.currentQuestionIndex).toBe(2);
});

function candidate(id: string, lastAnsweredAt: string | null) {
  return {
    id,
    code: id.toUpperCase(),
    topicId: "topic-1",
    difficulty: "BEGINNER" as const,
    lastAnsweredAt,
  };
}

function sessionQuestion(sequenceNo: number, answers: unknown[]) {
  return {
    id: `sq-${sequenceNo}`,
    sequence_no: sequenceNo,
    user_answers: answers,
    prompt_snapshot: {
      id: `q-${sequenceNo}`,
      code: `GENERAL_${sequenceNo}`,
      prompt_text: `Question ${sequenceNo}`,
      instruction_text: null,
      prep_seconds: 0,
      answer_seconds: 60,
      question_type: "GENERAL_OPEN_TOPIC",
      topic: { slug: "travel", name: "Travel" },
      prompt_items: [],
    },
  };
}
