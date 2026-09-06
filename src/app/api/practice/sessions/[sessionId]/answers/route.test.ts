import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizeSession,
  findRegisteredAnswer,
  getClientPracticeSession,
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
  getClientPracticeSession: vi.fn(),
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
  getClientPracticeSession,
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
    getClientPracticeSession.mockResolvedValue({ currentQuestionIndex: 2 });
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

  it("returns 401 when an owned-session upload loses its cookie principal", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(401);
    expect(authorizeSession).not.toHaveBeenCalled();
  });

  it("keeps an invalid guest bearer session indistinguishable from a missing session", async () => {
    const guest = { kind: "guest", token: "invalid-token" } as const;
    resolveSessionPrincipal.mockResolvedValue(guest);
    authorizeSession.mockResolvedValue(null);

    const response = await POST(answerRequest({ bearer: guest.token }), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(authorizeSession).toHaveBeenCalledWith("session-1", guest);
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

  it("returns the durable first unanswered question after registration skips an answered hole", async () => {
    questionBelongsToSession.mockResolvedValue({ id: "sq-1", sequence_no: 1 });
    findRegisteredAnswer.mockResolvedValue(registeredAnswer());
    registerPracticeAnswer.mockResolvedValue({
      answerId: "answer-1",
      status: "QUEUED",
      sequenceNo: 1,
    });
    // Questions 1 and 2 are now durably answered, so question 3 is the first gap.
    getClientPracticeSession.mockResolvedValue({ currentQuestionIndex: 2 });

    const response = await POST(answerRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(202);
    expect(getClientPracticeSession).toHaveBeenCalledWith({ id: "session-1" });
    expect(await response.json()).toMatchObject({ nextQuestionIndex: 2 });
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
      error: "Câu trả lời đang được xác nhận. Hãy gửi lại chính bản ghi này.",
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
      error: "Câu trả lời đang được xác nhận. Hãy gửi lại chính bản ghi này.",
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
    expect(await response.json()).toEqual({ error: "Không thể tải câu trả lời lên." });
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
      error: "Không thể dọn bản ghi âm chưa dùng.",
    });
    expect(recordAnswerProgress).not.toHaveBeenCalled();
  });
});

function answerRequest({ bearer }: { bearer?: string } = {}) {
  const form = new FormData();
  form.set("audio", new File(["abc"], "answer.webm", { type: "audio/webm" }));
  form.set("sessionQuestionId", "sq-1");
  form.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");
  form.set("durationMs", "1200");
  return new Request("http://localhost/api/practice/sessions/session-1/answers", {
    method: "POST",
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
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
