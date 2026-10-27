import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider, SpeechTimeoutError, streamSpeech, VOCABULARY_TTS_INSTRUCTIONS } from "./openai";

describe("OpenAIProvider.synthesize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_TTS_MODEL;
    delete process.env.OPENAI_TTS_VOICE;
  });

  it("sends vocabulary instructions and slower speed when provided", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValue(new Response(new ArrayBuffer(8), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await new OpenAIProvider().synthesize("demand.", {
      instructions: VOCABULARY_TTS_INSTRUCTIONS,
      speed: 0.9,
      voice: "nova",
    });

    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(request.model).toBe("gpt-4o-mini-tts");
    expect(request.voice).toBe("nova");
    expect(request.speed).toBe(0.9);
    expect(request.instructions).toContain("dictionary voice");
    expect(request.input).toBe("demand.");
  });

  it("gives up with SpeechTimeoutError when OpenAI does not answer in time", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    await expect(new OpenAIProvider().synthesize("slow.", { timeoutMs: 20 })).rejects.toBeInstanceOf(SpeechTimeoutError);
  });

  it("streams bytes once headers arrive, without buffering the body", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 })));
    const stream = await streamSpeech("hello", { timeoutMs: 1000 });
    const { value } = await stream.getReader().read();
    expect(Array.from(value ?? [])).toEqual([1, 2, 3]);
  });
});
