import { describe, expect, it } from "vitest";
import { AudioAccessError, resolveAuthorizedAudio } from "./audio-access";

const record = {
  answerId: "answer-1",
  bucket: "speaking-answers",
  path: "sessions/session-1/answers/answer-1.webm",
  mimeType: "audio/webm",
};

describe("resolveAuthorizedAudio", () => {
  it("rejects a missing or invalid guest token without looking up the answer", async () => {
    let lookedUp = false;
    const action = resolveAuthorizedAudio(
      { sessionId: "session-1", answerId: "answer-1", token: "wrong" },
      {
        authorizeSession: async () => false,
        findAnswerAudio: async () => {
          lookedUp = true;
          return record;
        },
      },
    );

    await expect(action).rejects.toEqual(new AudioAccessError(404, "Audio not found."));
    expect(lookedUp).toBe(false);
  });

  it("rejects an answer that does not belong to the authorized session", async () => {
    await expect(
      resolveAuthorizedAudio(
        { sessionId: "session-1", answerId: "other-answer", token: "valid" },
        { authorizeSession: async () => true, findAnswerAudio: async () => null },
      ),
    ).rejects.toEqual(new AudioAccessError(404, "Audio not found."));
  });

  it("returns only private storage metadata for an authorized session answer", async () => {
    await expect(
      resolveAuthorizedAudio(
        { sessionId: "session-1", answerId: "answer-1", token: "valid" },
        { authorizeSession: async () => true, findAnswerAudio: async () => record },
      ),
    ).resolves.toEqual(record);
  });
});
