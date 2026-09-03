import { expect, it } from "vitest";
import type { ClientPracticeSession, SessionQuestion } from "../../modules/practice/types";
import {
  AsyncRequestEpoch,
  authHeadersFor,
  nextQuestionIndexFromUpload,
  recoverGuestSession,
  retainObjectUrlIfCurrent,
  stageForSession,
} from "./session-model";

const question: SessionQuestion = {
  sessionQuestionId: "sq-1",
  sequenceNo: 1,
  id: "question-1",
  code: "IELTS_1",
  promptText: "Tell me about your home.",
  instructionText: null,
  prepSeconds: 0,
  answerSeconds: 30,
  questionType: "IELTS_PART_1",
  topic: null,
  promptItems: [],
};

it("uses bearer authorization only for guest sessions", () => {
  expect(authHeadersFor("guest", "raw-guest-token")).toEqual({
    Authorization: "Bearer raw-guest-token",
  });
  expect(authHeadersFor("user", "must-not-leak")).toBeUndefined();
  expect(authHeadersFor("guest", undefined)).toBeUndefined();
});

it("recovers the legacy IELTS guest payload with its bearer token", () => {
  expect(recoverGuestSession(JSON.stringify({
    sessionId: "session-1",
    token: "raw-guest-token",
    questions: [question],
    index: 1,
  }))).toEqual({
    sessionId: "session-1",
    sessionToken: "raw-guest-token",
    mode: "IELTS",
    status: "IN_PROGRESS",
    questions: [question],
    currentQuestionIndex: 1,
    topic: null,
  });
});

it("rejects malformed guest recovery data", () => {
  expect(recoverGuestSession("not-json")).toBeNull();
  expect(recoverGuestSession(JSON.stringify({ sessionId: "session-1" }))).toBeNull();
});

it("resumes completed answer sets in processing instead of replacing an answer", () => {
  const session: ClientPracticeSession = {
    sessionId: "session-1",
    mode: "IELTS",
    status: "IN_PROGRESS",
    questions: [question],
    currentQuestionIndex: 1,
    topic: null,
  };

  expect(stageForSession(session)).toBe("processing");
});

it("rejects a stale TTS object URL and revokes it", async () => {
  const epoch = new AsyncRequestEpoch();
  const staleRequest = epoch.begin();
  epoch.invalidate();
  const url = URL.createObjectURL(new Blob(["late audio"]));

  expect(retainObjectUrlIfCurrent(epoch, staleRequest, url)).toBe(false);
  await expect(fetch(url)).rejects.toThrow();
});

it("uses the authoritative next question index returned by answer registration", () => {
  expect(nextQuestionIndexFromUpload({ nextQuestionIndex: 3 }, 5)).toBe(3);
  expect(() => nextQuestionIndexFromUpload({ nextQuestionIndex: 6 }, 5))
    .toThrow("Invalid answer registration response");
});
