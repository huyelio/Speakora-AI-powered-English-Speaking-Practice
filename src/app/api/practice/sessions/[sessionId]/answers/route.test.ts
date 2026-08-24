import { beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.clearAllMocks();
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
