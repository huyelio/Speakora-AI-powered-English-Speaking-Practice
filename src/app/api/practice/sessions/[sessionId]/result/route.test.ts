import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizeSession,
  getAnswerReview,
  getAssessment,
  getGeneralResultExperience,
  getSessionStatus,
  resolveSessionPrincipal,
} = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  getAnswerReview: vi.fn(),
  getAssessment: vi.fn(),
  getGeneralResultExperience: vi.fn(),
  getSessionStatus: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));

vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/practice/repository", () => ({
  authorizeSession,
  getAnswerReview,
  getAssessment,
  getGeneralResultExperience,
  getSessionStatus,
}));

import { GET } from "./route";

const generalResult = {
  mode: "GENERAL",
  overallFeedback: "Clear communication.",
  strengths: [],
  improvements: [],
  nextSteps: [],
  criteria: null,
  usefulPhrase: "One thing I really enjoy is…",
  recommendationTags: [],
} as const;

describe("GET /api/practice/sessions/:sessionId/result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    getAnswerReview.mockResolvedValue([]);
  });

  it("returns authoritative General progress with a completed owned result", async () => {
    const session = {
      id: "session-1",
      status: "COMPLETED",
      mode: "GENERAL",
      userId: "user-1",
      guestTokenHash: null,
      questionCount: 5,
      topicId: "topic-1",
      difficulty: "BEGINNER",
    } as const;
    const experience = {
      rewards: { sessionXp: 95, totalXp: 345, level: 2 },
      dailyGoal: { completed: 5, target: 5, achieved: true },
      streak: { current: 3, longest: 8 },
      nextTopic: null,
    };
    authorizeSession.mockResolvedValue(session);
    getAssessment.mockResolvedValue(generalResult);
    getGeneralResultExperience.mockResolvedValue(experience);

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(getGeneralResultExperience).toHaveBeenCalledWith(session, generalResult);
    expect(await response.json()).toEqual({
      sessionId: "session-1",
      result: generalResult,
      answers: [],
      experience,
    });
  });

  it("does not manufacture progress for guest IELTS results", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "guest", token: "guest-token" });
    authorizeSession.mockResolvedValue({
      id: "session-1",
      status: "COMPLETED",
      mode: "IELTS",
      userId: null,
      guestTokenHash: "hash",
      questionCount: 5,
      topicId: null,
      difficulty: null,
    });
    getAssessment.mockResolvedValue({
      mode: "IELTS",
      estimatedBand: 6.5,
      overallFeedback: "Good.",
      strengths: [],
      improvements: [],
      nextSteps: [],
      criteria: null,
    });

    const response = await GET(request("guest-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("experience");
    expect(getGeneralResultExperience).not.toHaveBeenCalled();
  });
});

function request(token?: string) {
  return new Request("http://localhost/api/practice/sessions/session-1/result", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

function context() {
  return { params: Promise.resolve({ sessionId: "session-1" }) };
}
