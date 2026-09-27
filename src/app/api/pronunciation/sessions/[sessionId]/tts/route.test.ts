import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getPronunciationSessionItemSnapshot, resolveSessionPrincipal, synthesize } = vi.hoisted(() => ({
  getPronunciationSessionItemSnapshot: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
  synthesize: vi.fn(),
}));
vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/pronunciation-practice/repository", () => ({ getPronunciationSessionItemSnapshot }));
vi.mock("../../../../../../modules/ai-gateway/openai", () => ({
  VOCABULARY_TTS_INSTRUCTIONS: "dictionary instructions",
  OpenAIProvider: class { synthesize = synthesize; },
}));

import { POST } from "./route";

const sessionId = "11111111-1111-4111-8111-111111111111";
const sessionItemId = "22222222-2222-4222-8222-222222222222";

describe("POST /api/pronunciation/sessions/:sessionId/tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    getPronunciationSessionItemSnapshot.mockResolvedValue({ word: "Hello" });
    synthesize.mockResolvedValue(new ArrayBuffer(2));
  });

  it("uses the owned immutable snapshot and ignores client-supplied text", async () => {
    const response = await invoke({ sessionItemId, text: "malicious replacement" });
    expect(response.status).toBe(200);
    expect(getPronunciationSessionItemSnapshot).toHaveBeenCalledWith(sessionId, "user-1", sessionItemId);
    expect(synthesize).toHaveBeenCalledWith("Hello.", expect.objectContaining({ instructions: "dictionary instructions" }));
    expect(synthesize).not.toHaveBeenCalledWith(expect.stringContaining("malicious"), expect.anything());
  });

  it("does not call OpenAI for an unowned item", async () => {
    getPronunciationSessionItemSnapshot.mockResolvedValue(null);
    const response = await invoke({ sessionItemId });
    expect(response.status).toBe(404);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("returns 401 without a cookie principal", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    expect((await invoke({ sessionItemId })).status).toBe(401);
    expect(synthesize).not.toHaveBeenCalled();
  });
});

function invoke(body: unknown) {
  return POST(new Request(`http://localhost/api/pronunciation/sessions/${sessionId}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ sessionId }) });
}
