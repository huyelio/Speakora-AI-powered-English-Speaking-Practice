import { describe, expect, it, vi } from "vitest";
import { createPronunciationPracticeSession, readAttemptResponse, PronunciationApiError } from "./api";

describe("pronunciation client API contracts", () => {
  it("posts topic, level and default count and reads top-level sessionId", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ sessionId: "123" }, { status: 201 }));
    expect(await createPronunciationPracticeSession(fetcher, { topicId: "topic", level: "BEGINNER" })).toBe("/pronunciation/123");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ topicId: "topic", level: "BEGINNER", itemCount: 10 });
  });
  it("posts weak selection without inventing a separate endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ sessionId: "next" }));
    await createPronunciationPracticeSession(fetcher, { selection: "WEAK", sourceSessionId: "source" });
    expect(fetcher.mock.calls[0][0]).toBe("/api/pronunciation/sessions");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ selection: "WEAK", sourceSessionId: "source" });
  });
  it("preserves auth and stored attempt information on failures", async () => {
    await expect(readAttemptResponse(Response.json({ error: "retry", attemptId: "attempt", status: "FAILED" }, { status: 502 }))).rejects.toMatchObject({ status: 502, attemptId: "attempt" });
    await expect(readAttemptResponse(Response.json({ error: "sign in" }, { status: 401 }))).rejects.toMatchObject({ status: 401 });
  });
  it("handles completed idempotent responses without assuming they include a result", async () => {
    expect(await readAttemptResponse(Response.json({ attemptId: "attempt", status: "COMPLETED" }))).toBe("attempt");
    await expect(readAttemptResponse(Response.json({ attemptId: "attempt", status: "PROCESSING" }))).rejects.toMatchObject({ attemptId: "attempt", attemptStatus: "PROCESSING" });
    await expect(readAttemptResponse(Response.json({ ok: true }))).rejects.toBeInstanceOf(PronunciationApiError);
  });
  it("rejects malformed successful creation responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ session: { sessionId: "wrong" } }));
    await expect(createPronunciationPracticeSession(fetcher, { topicId: "topic", level: "BEGINNER" })).rejects.toThrow();
  });
});
