import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const {
  download,
  failPronunciationAttempt,
  getSupabaseAdminClient,
  processPronunciationAttempt,
  resolveSessionPrincipal,
  retryPronunciationAttempt,
  storageFrom,
} = vi.hoisted(() => ({
  download: vi.fn(),
  failPronunciationAttempt: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  processPronunciationAttempt: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
  retryPronunciationAttempt: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("../../../../../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/pronunciation-practice/processor", () => ({ processPronunciationAttempt }));
vi.mock("../../../../../../modules/pronunciation-practice/repository", () => ({
  failPronunciationAttempt,
  retryPronunciationAttempt,
}));

import { POST } from "./route";

const attemptId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/pronunciation/attempts/:attemptId/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    retryPronunciationAttempt.mockResolvedValue(attempt());
    download.mockResolvedValue({ data: new Blob(["stored audio"], { type: "audio/webm" }), error: null });
    storageFrom.mockReturnValue({ download });
    getSupabaseAdminClient.mockReturnValue({ storage: { from: storageFrom } });
    processPronunciationAttempt.mockResolvedValue({
      ok: true,
      attemptId,
      status: "COMPLETED",
      sessionStatus: "COMPLETED",
      result: { overall: { accuracy: 88 } },
    });
  });

  it("downloads the same private object and invokes the provider once without a new attempt", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(retryPronunciationAttempt).toHaveBeenCalledWith(attemptId, "user-1");
    expect(storageFrom).toHaveBeenCalledWith("speaking-answers");
    expect(download).toHaveBeenCalledWith(attempt().storagePath);
    expect(processPronunciationAttempt).toHaveBeenCalledTimes(1);
    expect(processPronunciationAttempt).toHaveBeenCalledWith(expect.objectContaining({ attemptId }), "user-1", expect.any(Blob));
  });

  it("returns 401 before looking up an attempt", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    expect((await invoke()).status).toBe(401);
    expect(retryPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("sanitizes authentication service failures", async () => {
    resolveSessionPrincipal.mockRejectedValue(new Error("cookie backend secret"));
    const response = await invoke();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("cookie backend secret");
    expect(retryPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("does not download or invoke the provider for a fresh processing attempt", async () => {
    retryPronunciationAttempt.mockRejectedValue(new Error("Pronunciation attempt is not retryable."));
    const response = await invoke();
    expect(response.status).toBe(409);
    expect(download).not.toHaveBeenCalled();
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
  });

  it("marks a claimed retry failed when its stored audio cannot be downloaded", async () => {
    download.mockResolvedValue({ data: null, error: { message: "private storage detail" } });
    failPronunciationAttempt.mockResolvedValue({ status: "FAILED" });
    const response = await invoke();
    expect(response.status).toBe(500);
    expect(failPronunciationAttempt).toHaveBeenCalledWith(
      attemptId,
      "user-1",
      "AUDIO_DOWNLOAD_ERROR",
      "Không thể tải bản ghi âm đã lưu. Vui lòng thử lại.",
    );
    expect(processPronunciationAttempt).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("private storage detail");
  });
});

function invoke() {
  return POST(new Request(`http://localhost/api/pronunciation/attempts/${attemptId}/retry`, { method: "POST" }), {
    params: Promise.resolve({ attemptId }),
  });
}

function attempt() {
  return {
    attemptId,
    sessionId: "22222222-2222-4222-8222-222222222222",
    sessionItemId: "33333333-3333-4333-8333-333333333333",
    status: "PROCESSING",
    storageBucket: "speaking-answers",
    storagePath: "users/user-1/pronunciation/sessions/22222222-2222-4222-8222-222222222222/attempts/11111111-1111-4111-8111-111111111111.webm",
    mimeType: "audio/webm",
    sizeBytes: 12,
    durationMs: 850,
    processingStartedAt: "2026-09-27T00:00:00Z",
    snapshot: { word: "hello", pronunciationIpa: "/ipa/", meaningVi: "xin chào", level: "BEGINNER" },
  };
}
