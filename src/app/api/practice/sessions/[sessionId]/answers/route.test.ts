import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizeSession,
  findRegisteredAnswer,
  getSupabaseAdminClient,
  questionBelongsToSession,
  recordAnswerProgress,
  registerPracticeAnswer,
  remove,
  resolveSessionPrincipal,
  storageFrom,
  upload,
  validateAudio,
} = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  findRegisteredAnswer: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  questionBelongsToSession: vi.fn(),
  recordAnswerProgress: vi.fn(),
  registerPracticeAnswer: vi.fn(),
  remove: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  validateAudio: vi.fn(),
}));

vi.mock("../../../../../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../../../../../../modules/audio/validation", () => ({ validateAudio }));
vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/practice/repository", () => ({
  authorizeSession,
  findRegisteredAnswer,
  questionBelongsToSession,
  recordAnswerProgress,
  registerPracticeAnswer,
}));

import { POST } from "./route";

const principal = { kind: "user", userId: "user-1" } as const;

describe("POST /api/practice/sessions/:sessionId/answers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    resolveSessionPrincipal.mockResolvedValue(principal);
    authorizeSession.mockResolvedValue({ id: "session-1" });
    questionBelongsToSession.mockResolvedValue({ id: "sq-1", sequence_no: 2 });
    validateAudio.mockReturnValue("webm");
    recordAnswerProgress.mockResolvedValue(undefined);
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    storageFrom.mockReturnValue({ upload, remove });
    getSupabaseAdminClient.mockReturnValue({ storage: { from: storageFrom } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authorizes with one resolved principal", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(authorizeSession).not.toHaveBeenCalled();
  });

  it("records progress only after idempotent registration returns the existing answer", async () => {
    findRegisteredAnswer.mockResolvedValue({
      id: "answer-1",
      status: "QUEUED",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      storagePath: "sessions/session-1/answers/answer-1.webm",
      mimeType: "audio/webm",
      durationMs: 1200,
      sizeBytes: 3,
    });
    registerPracticeAnswer.mockResolvedValue({
      answerId: "answer-1",
      status: "QUEUED",
      sequenceNo: 2,
    });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(202);
    expect(authorizeSession).toHaveBeenCalledWith("session-1", principal);
    expect(registerPracticeAnswer).toHaveBeenCalledWith(expect.objectContaining({
      answerId: "answer-1",
      sessionId: "session-1",
      sessionQuestionId: "sq-1",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    }));
    expect(recordAnswerProgress).toHaveBeenCalledWith("answer-1");
    expect(registerPracticeAnswer.mock.invocationCallOrder[0]).toBeLessThan(
      recordAnswerProgress.mock.invocationCallOrder[0],
    );
    expect(await response.json()).toEqual({
      answerId: "answer-1",
      status: "QUEUED",
      nextQuestionIndex: 2,
    });
  });

  it("reconciles a committed answer when the registration response is lost", async () => {
    let attemptedPath = "";
    findRegisteredAnswer
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async () => registeredAnswer({ storagePath: attemptedPath }));
    registerPracticeAnswer.mockImplementationOnce(async (input) => {
      attemptedPath = input.storagePath;
      throw new Error("Registration response was lost.");
    });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(202);
    expect(remove).not.toHaveBeenCalled();
    expect(recordAnswerProgress).toHaveBeenCalledWith("answer-1");
    expect(await response.json()).toEqual({
      answerId: "answer-1",
      status: "UPLOADED",
      nextQuestionIndex: 2,
    });
  });

  it("retains the upload when registration reconciliation also fails", async () => {
    findRegisteredAnswer
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("Reconciliation unavailable."));
    registerPracticeAnswer.mockRejectedValueOnce(new Error("Registration response was lost."));

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Answer registration is still being confirmed. Retry the same answer.",
    });
    expect(remove).not.toHaveBeenCalled();
    expect(recordAnswerProgress).not.toHaveBeenCalled();
  });

  it("retains the upload when commit-later reconciliation immediately returns null", async () => {
    findRegisteredAnswer.mockResolvedValue(null);
    registerPracticeAnswer.mockRejectedValueOnce(new Error("Registration response was lost."));
    remove.mockResolvedValueOnce({ error: { message: "provider detail" } });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Answer registration is still being confirmed. Retry the same answer.",
    });
    expect(remove).not.toHaveBeenCalled();
    expect(recordAnswerProgress).not.toHaveBeenCalled();
  });

  it("cleans up only when a conflicting durable answer proves registration rolled back", async () => {
    findRegisteredAnswer
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(registeredAnswer({
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
      }));
    registerPracticeAnswer.mockRejectedValueOnce(new Error("Question already has an answer."));

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(500);
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^sessions\/session-1\/answers\/[0-9a-f-]+\.webm$/),
    ]);
    expect(await response.json()).toEqual({ error: "Unable to upload answer." });
    expect(recordAnswerProgress).not.toHaveBeenCalled();
  });

  it("removes a racing duplicate upload and records progress for the registered answer", async () => {
    findRegisteredAnswer.mockResolvedValue(null);
    registerPracticeAnswer.mockResolvedValue({
      answerId: "answer-from-race",
      status: "QUEUED",
      sequenceNo: 2,
    });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(202);
    expect(upload).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^sessions\/session-1\/answers\/[0-9a-f-]+\.webm$/),
    ]);
    expect(recordAnswerProgress).toHaveBeenCalledWith("answer-from-race");
  });

  it("surfaces a sanitized error when racing duplicate cleanup fails", async () => {
    findRegisteredAnswer.mockResolvedValue(null);
    registerPracticeAnswer.mockResolvedValue({
      answerId: "answer-from-race",
      status: "QUEUED",
      sequenceNo: 2,
    });
    remove.mockResolvedValueOnce({ error: { message: "provider detail" } });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to clean up unused answer upload.",
    });
    expect(recordAnswerProgress).not.toHaveBeenCalled();
  });
});

function answerRequest() {
  const form = new FormData();
  form.set("audio", new File(["abc"], "answer.webm", { type: "audio/webm" }));
  form.set("sessionQuestionId", "sq-1");
  form.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");
  form.set("durationMs", "1200");
  return new Request("http://localhost/api/practice/sessions/session-1/answers", {
    method: "POST",
    body: form,
  });
}

function registeredAnswer(overrides: {
  idempotencyKey?: string;
  storagePath?: string;
} = {}) {
  return {
    id: "answer-1",
    status: "UPLOADED",
    idempotencyKey: overrides.idempotencyKey ?? "11111111-1111-4111-8111-111111111111",
    storagePath: overrides.storagePath ?? "sessions/session-1/answers/answer-1.webm",
    mimeType: "audio/webm",
    durationMs: 1200,
    sizeBytes: 3,
  };
}
