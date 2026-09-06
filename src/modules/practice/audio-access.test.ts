import { describe, expect, it } from "vitest";
import { AudioAccessError, resolveAuthorizedAudio } from "./audio-access";
import type { SessionPrincipal } from "./auth";

const record = {
  answerId: "answer-1",
  bucket: "speaking-answers",
  path: "sessions/session-1/answers/answer-1.webm",
  mimeType: "audio/webm",
};

const userPrincipal: SessionPrincipal = { kind: "user", userId: "user-1" };
const guestPrincipal: SessionPrincipal = { kind: "guest", token: "guest-token" };

describe("resolveAuthorizedAudio", () => {
  it("rejects an invalid principal without looking up the answer", async () => {
    let lookedUp = false;
    const action = resolveAuthorizedAudio(
      { sessionId: "session-1", answerId: "answer-1", principal: userPrincipal },
      {
        authorizeSession: async () => null,
        findAnswerAudio: async () => {
          lookedUp = true;
          return record;
        },
      },
    );

    await expect(action).rejects.toEqual(new AudioAccessError(404, "Không tìm thấy bản ghi âm."));
    expect(lookedUp).toBe(false);
  });

  it("rejects an answer that does not belong to the authorized session", async () => {
    await expect(
      resolveAuthorizedAudio(
        { sessionId: "session-1", answerId: "other-answer", principal: guestPrincipal },
        { authorizeSession: async () => ({ id: "session-1" }), findAnswerAudio: async () => null },
      ),
    ).rejects.toEqual(new AudioAccessError(404, "Không tìm thấy bản ghi âm."));
  });

  it("returns only private storage metadata for an authorized user session answer", async () => {
    let receivedPrincipal: SessionPrincipal | undefined;

    await expect(
      resolveAuthorizedAudio(
        { sessionId: "session-1", answerId: "answer-1", principal: userPrincipal },
        {
          authorizeSession: async (_sessionId, principal) => {
            receivedPrincipal = principal;
            return { id: "session-1" };
          },
          findAnswerAudio: async () => record,
        },
      ),
    ).resolves.toEqual(record);
    expect(receivedPrincipal).toEqual(userPrincipal);
  });
});
