import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { processPronunciationAttempt } from "./processor";

const result = {
  schemaVersion: 1 as const,
  referenceText: "hello",
  scoredText: "hello",
  languageCode: "en" as const,
  overall: { speakingRate: 2, accuracy: 91, completeness: 100 },
  words: [],
};

const attempt = {
  attemptId: "attempt-1",
  sessionId: "session-1",
  sessionItemId: "item-1",
  status: "PROCESSING" as const,
  storageBucket: "speaking-answers",
  storagePath: "users/user-1/pronunciation/sessions/session-1/attempts/attempt-1.webm",
  mimeType: "audio/webm",
  sizeBytes: 5,
  durationMs: 500,
  processingStartedAt: "2026-09-27T00:00:00Z",
  snapshot: { word: "hello", pronunciationIpa: "/həˈləʊ/", meaningVi: "xin chào", level: "BEGINNER" as const },
};

describe("processPronunciationAttempt", () => {
  it("calls the provider once, persists raw JSON, and returns only normalized output", async () => {
    const rawResult = { text: "hello", provider_trace: "audit-only" };
    const analyze = vi.fn().mockResolvedValue({ result, rawResult });
    const complete = vi.fn().mockResolvedValue({ status: "COMPLETED", sessionStatus: "COMPLETED" });
    const fail = vi.fn();

    const output = await processPronunciationAttempt(
      attempt,
      "user-1",
      new Blob(["audio"], { type: "audio/webm" }),
      { provider: { analyze }, complete, fail },
    );

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ rawResult, normalizedResult: result }));
    expect(output).toEqual({
      ok: true,
      attemptId: "attempt-1",
      status: "COMPLETED",
      sessionStatus: "COMPLETED",
      result,
    });
    expect(JSON.stringify(output)).not.toContain("audit-only");
    expect(fail).not.toHaveBeenCalled();
  });

  it("marks a provider failure with fixed safe details", async () => {
    const analyze = vi.fn().mockRejectedValue(new Error("secret provider body"));
    const fail = vi.fn().mockResolvedValue({ status: "FAILED" });

    const output = await processPronunciationAttempt(
      attempt,
      "user-1",
      new Blob(["audio"]),
      { provider: { analyze }, complete: vi.fn(), fail },
    );

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(fail).toHaveBeenCalledWith(
      "attempt-1",
      "user-1",
      "PROVIDER_ERROR",
      "Không thể phân tích phát âm. Vui lòng thử lại.",
    );
    expect(JSON.stringify(output)).not.toContain("secret provider body");
  });
});
