import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createPronunciationSession, createWeakPronunciationSession, resolveSessionPrincipal } = vi.hoisted(() => ({
  createPronunciationSession: vi.fn(),
  createWeakPronunciationSession: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));

vi.mock("../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../modules/pronunciation-practice/repository", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../../modules/pronunciation-practice/repository")>(),
  createPronunciationSession,
  createWeakPronunciationSession,
}));

import { POST } from "./route";

const topicId = "11111111-1111-4111-8111-111111111111";
const sourceSessionId = "22222222-2222-4222-8222-222222222222";
const result = { sessionId: "session-1", items: [] };

describe("POST /api/pronunciation/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns 401 before processing input when the cookie session is missing", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    const response = await POST(jsonRequest({ invalid: true }));
    expect(response.status).toBe(401);
    expect(createPronunciationSession).not.toHaveBeenCalled();
  });

  it("creates a standard ten-item session by default", async () => {
    createPronunciationSession.mockResolvedValue(result);
    const response = await POST(jsonRequest({ topicId, level: "BEGINNER" }));
    expect(response.status).toBe(201);
    expect(createPronunciationSession).toHaveBeenCalledWith("user-1", topicId, "BEGINNER", 10);
  });

  it("creates a weak-only session without accepting standard-session fields", async () => {
    createWeakPronunciationSession.mockResolvedValue(result);
    const response = await POST(jsonRequest({ sourceSessionId, selection: "WEAK" }));
    expect(response.status).toBe(201);
    expect(createWeakPronunciationSession).toHaveBeenCalledWith("user-1", sourceSessionId);
  });

  it.each([0, 21, 1.5])("rejects invalid itemCount %s", async (itemCount) => {
    const response = await POST(jsonRequest({ topicId, level: "BEGINNER", itemCount }));
    expect(response.status).toBe(400);
    expect(createPronunciationSession).not.toHaveBeenCalled();
  });

  it("does not expose repository errors", async () => {
    createPronunciationSession.mockRejectedValue(new Error("database secret"));
    const response = await POST(jsonRequest({ topicId, level: "BEGINNER" }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("database secret");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/pronunciation/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
