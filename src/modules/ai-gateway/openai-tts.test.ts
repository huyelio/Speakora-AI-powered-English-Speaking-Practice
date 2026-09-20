import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider, VOCABULARY_TTS_INSTRUCTIONS } from "./openai";

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
});
