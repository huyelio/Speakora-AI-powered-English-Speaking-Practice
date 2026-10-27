import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  resolveSessionPrincipal: vi.fn(),
  resolveSpeech: vi.fn(),
  cachedSpeech: vi.fn(),
  streamSpeech: vi.fn(),
}));
vi.mock("../../../modules/practice/auth", () => ({ resolveSessionPrincipal: mocks.resolveSessionPrincipal }));
vi.mock("../../../modules/tts/sources", () => ({ resolveSpeech: mocks.resolveSpeech, ttsKinds: ["vocabulary", "pronunciation", "question", "conversation"] }));
vi.mock("../../../modules/tts/cache", () => ({ cachedSpeech: mocks.cachedSpeech, supabaseTtsStorage: () => ({}) }));
vi.mock("../../../lib/supabase/server", () => ({ getSupabaseAdminClient: () => ({}) }));
vi.mock("../../../modules/ai-gateway/openai", async () => {
  class SpeechTimeoutError extends Error {}
  return { SpeechTimeoutError, streamSpeech: mocks.streamSpeech, OpenAIProvider: class { synthesize = vi.fn(); } };
});

import { SpeechTimeoutError } from "../../../modules/ai-gateway/openai";
import { GET } from "./route";

const session = "11111111-1111-4111-8111-111111111111";
const item = "22222222-2222-4222-8222-222222222222";
const get = (kind = "vocabulary") => GET(new Request(`http://localhost/api/tts?kind=${kind}&session=${session}&item=${item}`));

describe("GET /api/tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
  });

  it("validates the query before any lookup", async () => {
    expect((await GET(new Request(`http://localhost/api/tts?kind=other&session=${session}&item=${item}`))).status).toBe(400);
    expect((await GET(new Request(`http://localhost/api/tts?kind=vocabulary&session=bad&item=${item}`))).status).toBe(400);
    expect(mocks.resolveSpeech).not.toHaveBeenCalled();
  });

  it("requires a principal and an authorized item", async () => {
    mocks.resolveSessionPrincipal.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    mocks.resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    mocks.resolveSpeech.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
    expect(mocks.cachedSpeech).not.toHaveBeenCalled();
  });

  it("serves fixed audio from the shared cache with a browser-cacheable response", async () => {
    mocks.resolveSpeech.mockResolvedValue({ text: "ambition.", options: {}, cacheable: true });
    mocks.cachedSpeech.mockResolvedValue({ audio: new ArrayBuffer(4), hit: true });
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=");
    expect(response.headers.get("X-TTS-Cache")).toBe("hit");
    expect(mocks.streamSpeech).not.toHaveBeenCalled();
  });

  it("streams per-learner AI text, uncached and no-store", async () => {
    mocks.resolveSpeech.mockResolvedValue({ text: "Where are you flying today?", options: {}, cacheable: false });
    mocks.streamSpeech.mockResolvedValue(new ReadableStream({ start(stream) { stream.enqueue(new Uint8Array([1])); stream.close(); } }));
    const response = await get("conversation");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.cachedSpeech).not.toHaveBeenCalled();
  });

  it("answers 504 with retry copy when OpenAI times out", async () => {
    mocks.resolveSpeech.mockResolvedValue({ text: "x", options: {}, cacheable: true });
    mocks.cachedSpeech.mockRejectedValue(new SpeechTimeoutError());
    const response = await get();
    expect(response.status).toBe(504);
    expect((await response.json()).error).toContain("Thử nghe lại");
  });
});
