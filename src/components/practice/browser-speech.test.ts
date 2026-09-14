import { describe, expect, it, vi } from "vitest";
import { isBrowserSpeechSupported, startBrowserSpeech } from "./browser-speech";

describe("browser-speech", () => {
  it("reports unsupported when SpeechRecognition is missing", () => {
    const original = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });
    expect(isBrowserSpeechSupported()).toBe(false);
    Object.defineProperty(globalThis, "window", { value: original, configurable: true });
  });

  it("accumulates final transcripts and resolves on stop", async () => {
    type Handler = ((event: unknown) => void) | null;
    const instance = {
      continuous: false,
      interimResults: false,
      lang: "",
      onresult: null as Handler,
      onerror: null as Handler,
      onend: null as Handler,
      start: vi.fn(),
      stop: vi.fn(function stop(this: typeof instance) {
        this.onend?.({});
      }),
      abort: vi.fn(),
    };

    const fakeWindow = {
      SpeechRecognition: vi.fn(() => instance),
      webkitSpeechRecognition: undefined,
      setTimeout: globalThis.setTimeout.bind(globalThis),
    };
    const original = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });

    try {
      const handle = startBrowserSpeech("en-US");
      expect(handle).not.toBeNull();
      expect(instance.start).toHaveBeenCalled();

      instance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "Hello there" } }],
      });

      await expect(handle!.stop()).resolves.toBe("Hello there");
    } finally {
      Object.defineProperty(globalThis, "window", { value: original, configurable: true });
    }
  });
});
