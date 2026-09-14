import { describe, expect, it } from "vitest";
import { createVocabularyPracticeSession } from "./start-vocabulary-session";

describe("createVocabularyPracticeSession", () => {
  it("posts topic, level, and itemCount then returns the session path", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ sessionId: "sess-1" }), { status: 201 });

    await expect(
      createVocabularyPracticeSession(fetchImpl as typeof fetch, "topic-1", "BEGINNER", 8),
    ).resolves.toBe("/vocabulary/sess-1");
  });
});
