import { expect, it, vi } from "vitest";
import { createTopicPracticeSession } from "./start-topic-session";

it("creates one five-question General session and returns its owned route", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
    sessionId: "session-123",
  }), { status: 201, headers: { "Content-Type": "application/json" } }));

  await expect(createTopicPracticeSession(
    fetcher,
    "11111111-1111-4111-8111-111111111111",
    "INTERMEDIATE",
  )).resolves.toBe("/practice/session-123");
  expect(fetcher).toHaveBeenCalledWith("/api/practice/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "GENERAL",
      topicId: "11111111-1111-4111-8111-111111111111",
      difficulty: "INTERMEDIATE",
      questionCount: 5,
    }),
  });
});

it("surfaces the safe API error instead of navigating", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
    error: "This topic level is not currently available.",
  }), { status: 400, headers: { "Content-Type": "application/json" } }));

  await expect(createTopicPracticeSession(
    fetcher,
    "11111111-1111-4111-8111-111111111111",
    "BEGINNER",
  )).rejects.toThrow("This topic level is not currently available.");
});
