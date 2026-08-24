import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createGeneralPracticeSession,
  createGuestCredentials,
  createPracticeSession,
  resolveSessionPrincipal,
} = vi.hoisted(() => ({
  createGeneralPracticeSession: vi.fn(),
  createGuestCredentials: vi.fn(),
  createPracticeSession: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));

vi.mock("../../../../modules/practice/auth", () => ({
  createGuestCredentials,
  resolveSessionPrincipal,
}));
vi.mock("../../../../modules/practice/repository", () => ({
  createGeneralPracticeSession,
  createPracticeSession,
}));

import { POST } from "./route";

const generalResult = {
  sessionId: "general-session",
  topic: { slug: "travel", name: "Travel" },
  questions: [{ sessionQuestionId: "sq-1", sequenceNo: 1 }],
};

describe("POST /api/practice/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a verified user principal for General practice", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "guest", token: "guest-token" });

    const response = await POST(jsonRequest({
      mode: "GENERAL",
      topicId: "11111111-1111-4111-8111-111111111111",
      difficulty: "BEGINNER",
      questionCount: 5,
    }));

    expect(response.status).toBe(401);
    expect(createGeneralPracticeSession).not.toHaveBeenCalled();
  });

  it("creates General practice for the verified user and never trusts a body user id", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "verified-user" });
    createGeneralPracticeSession.mockResolvedValue(generalResult);

    const response = await POST(jsonRequest({
      mode: "GENERAL",
      userId: "caller-controlled-user",
      topicId: "11111111-1111-4111-8111-111111111111",
      difficulty: "INTERMEDIATE",
      questionCount: 5,
    }));

    expect(response.status).toBe(201);
    expect(createGeneralPracticeSession).toHaveBeenCalledWith(
      "verified-user",
      "11111111-1111-4111-8111-111111111111",
      "INTERMEDIATE",
    );
    expect(await response.json()).toEqual({
      ...generalResult,
      mode: "GENERAL",
      status: "IN_PROGRESS",
    });
  });

  it("preserves guest IELTS creation and returns the raw token only in that response", async () => {
    createGuestCredentials.mockReturnValue({ token: "raw-token", hash: "stored-hash" });
    createPracticeSession.mockResolvedValue({ sessionId: "ielts-session", questions: [] });

    const response = await POST(jsonRequest({ mode: "IELTS", questionCount: 5 }));

    expect(response.status).toBe(201);
    expect(createPracticeSession).toHaveBeenCalledWith("stored-hash");
    expect(await response.json()).toEqual({
      sessionId: "ielts-session",
      mode: "IELTS",
      questions: [],
      sessionToken: "raw-token",
      status: "IN_PROGRESS",
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/practice/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
