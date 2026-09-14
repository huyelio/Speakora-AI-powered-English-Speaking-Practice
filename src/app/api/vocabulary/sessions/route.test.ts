import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createVocabularySession,
  resolveSessionPrincipal,
} = vi.hoisted(() => ({
  createVocabularySession: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));

vi.mock("../../../../modules/practice/auth", () => ({
  resolveSessionPrincipal,
}));
vi.mock("../../../../modules/vocabulary/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../modules/vocabulary/repository")>();
  return {
    ...actual,
    createVocabularySession,
  };
});

import { InsufficientVocabularyItemsError } from "../../../../modules/vocabulary/repository";
import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/vocabulary/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const result = {
  sessionId: "vocab-session",
  topic: { id: "topic-1", slug: "work", name: "Work" },
  level: "INTERMEDIATE",
  itemCount: 10,
  status: "IN_PROGRESS",
  items: [],
};

describe("POST /api/vocabulary/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a signed-in user", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    const response = await POST(jsonRequest({
      topicId: "11111111-1111-4111-8111-111111111111",
      level: "INTERMEDIATE",
      itemCount: 10,
    }));
    expect(response.status).toBe(401);
  });

  it("creates a vocabulary session for the verified user", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    createVocabularySession.mockResolvedValue(result);

    const response = await POST(jsonRequest({
      topicId: "11111111-1111-4111-8111-111111111111",
      level: "INTERMEDIATE",
      itemCount: 10,
    }));

    expect(response.status).toBe(201);
    expect(createVocabularySession).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      "INTERMEDIATE",
      10,
    );
    expect(await response.json()).toEqual(result);
  });

  it("returns 400 when there are not enough items", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    createVocabularySession.mockRejectedValue(
      new InsufficientVocabularyItemsError("topic", "BEGINNER", 10, 2),
    );

    const response = await POST(jsonRequest({
      topicId: "11111111-1111-4111-8111-111111111111",
      level: "BEGINNER",
      itemCount: 10,
    }));

    expect(response.status).toBe(400);
  });
});
