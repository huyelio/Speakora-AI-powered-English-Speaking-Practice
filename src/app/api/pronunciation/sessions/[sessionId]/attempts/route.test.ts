import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  claimPronunciationAttemptProcessing,
  findPronunciationAttemptByIdempotency,
  getPronunciationSessionItemSnapshot,
  getSupabaseAdminClient,
  processPronunciationAttempt,
  registerPronunciationAttempt,
  remove,
  resolveSessionPrincipal,
  storageFrom,
  upload,
} = vi.hoisted(() => ({
  claimPronunciationAttemptProcessing: vi.fn(),
  findPronunciationAttemptByIdempotency: vi.fn(),
  getPronunciationSessionItemSnapshot: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  processPronunciationAttempt: vi.fn(),
  registerPronunciationAttempt: vi.fn(),
  remove: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("../../../../../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/pronunciation-practice/processor", () => ({ processPronunciationAttempt }));
vi.mock("../../../../../../modules/pronunciation-practice/repository", () => ({
  claimPronunciationAttemptProcessing,
  findPronunciationAttemptByIdempotency,
  getPronunciationSessionItemSnapshot,
  registerPronunciationAttempt,
}));

import { POST } from "./route";

const sessionId = "11111111-1111-4111-8111-111111111111";
const sessionItemId = "22222222-2222-4222-8222-222222222222";
const idempotencyKey = "33333333-3333-4333-8333-333333333333";
const principal = { kind: "user", userId: "user-1" } as const;

describe("POST /api/pronunciation/sessions/:sessionId/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSessionPrincipal.mockResolvedValue(principal);
    getPronunciationSessionItemSnapshot.mockResolvedValue({ word: "hello" });
    findPronunciationAttemptByIdempotency.mockResolvedValue(null);
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    storageFrom.mockReturnValue({ upload, remove });
    getSupabaseAdminClient.mockReturnValue({ storage: { from: storageFrom } });
    registerPronunciationAttempt.mockImplementation(async (input) => ({
      attemptId: input.attemptId,
      status: "UPLOADED",
    }));
    claimPronunciationAttemptProcessing.mockImplementation(async (attemptId) => processingAttempt(attemptId));
    processPronunciationAttempt.mockResolvedValue({
      ok: true,
      attemptId: "attempt-1",
      status: "COMPLETED",
      sessionStatus: "IN_PROGRESS",
      result: { overall: { accuracy: 91 } },
    });
  });

  it("requires authentication before reading multipart data", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    const response = await invoke(new Request("http://localhost", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it("sanitizes authentication service failures", async () => {
    resolveSessionPrincipal.mockRejectedValue(new Error("cookie backend secret"));
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("cookie backend secret");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects audio above 10 MiB before Storage or provider work", async () => {
    const response = await invoke(formRequest(new Uint8Array(10 * 1024 * 1024 + 1)));
    expect(response.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("uploads to the private user-scoped path and processes exactly once", async () => {
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/user-1\/pronunciation\/sessions\/11111111-1111-4111-8111-111111111111\/attempts\/[0-9a-f-]+\.webm$/),
      expect.any(File),
      { contentType: "audio/webm", upsert: false },
    );
    expect(registerPronunciationAttempt).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      sessionItemId,
      idempotencyKey,
    }));
    expect(processPronunciationAttempt).toHaveBeenCalledTimes(1);
  });

  it("returns an existing idempotent attempt without uploading or processing again", async () => {
    findPronunciationAttemptByIdempotency.mockResolvedValue(processingAttempt("attempt-existing", "COMPLETED"));
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attemptId: "attempt-existing", status: "COMPLETED" });
    expect(upload).not.toHaveBeenCalled();
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("does not call the provider when Storage upload fails", async () => {
    upload.mockResolvedValue({ error: { message: "storage provider detail" } });
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(500);
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("provider detail");
  });

  it("removes only its new object when a registration race resolves to another upload", async () => {
    registerPronunciationAttempt.mockRejectedValue(new Error("duplicate"));
    findPronunciationAttemptByIdempotency
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(processingAttempt("attempt-existing", "PROCESSING"));
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(200);
    expect(remove).toHaveBeenCalledOnce();
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("marks and returns a sanitized provider failure with the attempt id", async () => {
    processPronunciationAttempt.mockResolvedValue({
      ok: false,
      attemptId: "attempt-1",
      status: "FAILED",
      error: "Không thể phân tích phát âm. Vui lòng thử lại.",
    });
    const response = await invoke(formRequest("audio"));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toMatchObject({ status: "FAILED" });
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});

function formRequest(bytes: BlobPart) {
  const form = new FormData();
  form.set("sessionItemId", sessionItemId);
  form.set("idempotencyKey", idempotencyKey);
  form.set("durationMs", "850");
  form.set("audio", new File([bytes], "recording.webm", { type: "audio/webm" }));
  return new Request(`http://localhost/api/pronunciation/sessions/${sessionId}/attempts`, { method: "POST", body: form });
}

function invoke(request: Request) {
  return POST(request, { params: Promise.resolve({ sessionId }) });
}

function processingAttempt(attemptId: string, status = "PROCESSING") {
  return {
    attemptId,
    sessionId,
    sessionItemId,
    status,
    storageBucket: "speaking-answers",
    storagePath: `users/user-1/pronunciation/sessions/${sessionId}/attempts/${attemptId}.webm`,
    mimeType: "audio/webm",
    sizeBytes: 5,
    durationMs: 850,
    processingStartedAt: "2026-09-27T00:00:00Z",
    snapshot: { word: "hello", pronunciationIpa: "/ipa/", meaningVi: "xin chào", level: "BEGINNER" },
  };
}
