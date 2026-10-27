import { describe, expect, it, vi } from "vitest";
import { cachedSpeech, ttsCachePath, type TtsCacheStorage } from "./cache";

const base = { text: "ambition.", options: { voice: "coral", speed: 0.9, instructions: "dictionary", model: "gpt-4o-mini-tts" } };

describe("ttsCachePath", () => {
  it("is stable for equal requests", () => {
    expect(ttsCachePath(base)).toBe(ttsCachePath({ ...base, options: { ...base.options } }));
    expect(ttsCachePath(base)).toMatch(/^v1\/[0-9a-f]{2}\/[0-9a-f]{64}\.mp3$/);
  });

  it("changes when text, voice, model, speed or instructions change", () => {
    const variants = [
      { ...base, text: "ambitious." },
      { ...base, options: { ...base.options, voice: "marin" } },
      { ...base, options: { ...base.options, model: "tts-1" } },
      { ...base, options: { ...base.options, speed: 1 } },
      { ...base, options: { ...base.options, instructions: "examiner" } },
    ];
    const paths = new Set([base, ...variants].map(ttsCachePath));
    expect(paths.size).toBe(variants.length + 1);
  });
});

describe("cachedSpeech", () => {
  function storage(cached: ArrayBuffer | null): TtsCacheStorage & { upload: ReturnType<typeof vi.fn> } {
    return { download: vi.fn().mockResolvedValue(cached), upload: vi.fn().mockResolvedValue(undefined) };
  }

  it("serves a hit without calling OpenAI", async () => {
    const synthesize = vi.fn();
    const result = await cachedSpeech(storage(new ArrayBuffer(4)), synthesize, base);
    expect(result.hit).toBe(true);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("synthesizes and stores a miss under the request's path", async () => {
    const store = storage(null);
    const synthesize = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const result = await cachedSpeech(store, synthesize, base);
    expect(result).toMatchObject({ hit: false });
    expect(synthesize).toHaveBeenCalledWith("ambition.", base.options);
    expect(store.upload).toHaveBeenCalledWith(ttsCachePath(base), expect.any(ArrayBuffer));
  });

  it("still answers when Storage reads or writes fail", async () => {
    const store = { download: vi.fn().mockRejectedValue(new Error("down")), upload: vi.fn().mockRejectedValue(new Error("down")) };
    const result = await cachedSpeech(store, vi.fn().mockResolvedValue(new ArrayBuffer(8)), base);
    expect(result.hit).toBe(false);
  });
});
