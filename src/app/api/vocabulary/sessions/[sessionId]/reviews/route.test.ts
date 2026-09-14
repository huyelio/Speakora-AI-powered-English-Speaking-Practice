import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  resolveSessionPrincipal,
  saveVocabularyReview,
} = vi.hoisted(() => ({
  resolveSessionPrincipal: vi.fn(),
  saveVocabularyReview: vi.fn(),
}));

vi.mock("../../../../../../modules/practice/auth", () => ({
  resolveSessionPrincipal,
}));
vi.mock("../../../../../../modules/vocabulary/repository", () => ({
  saveVocabularyReview,
}));

import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/vocabulary/sessions/s1/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/vocabulary/sessions/[sessionId]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a remembered review for the owner", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    saveVocabularyReview.mockResolvedValue({
      sessionId: "s1",
      status: "IN_PROGRESS",
      rememberedCount: 1,
      notRememberedCount: 0,
      items: [],
    });

    const response = await POST(
      jsonRequest({
        sessionItemId: "11111111-1111-4111-8111-111111111111",
        result: "REMEMBERED",
      }),
      { params: Promise.resolve({ sessionId: "s1" }) },
    );

    expect(response.status).toBe(200);
    expect(saveVocabularyReview).toHaveBeenCalledWith(
      "s1",
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      "REMEMBERED",
    );
  });

  it("rejects invalid review payloads", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    const response = await POST(
      jsonRequest({ sessionItemId: "bad", result: "MAYBE" }),
      { params: Promise.resolve({ sessionId: "s1" }) },
    );
    expect(response.status).toBe(400);
  });
});
