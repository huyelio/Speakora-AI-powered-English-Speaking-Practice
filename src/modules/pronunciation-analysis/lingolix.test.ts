import { afterEach, describe, expect, it, vi } from "vitest";
import successFixture from "./fixtures/lingolix-word-success.json";
import { LingolixPronunciationProvider } from "./lingolix";

vi.mock("server-only", () => ({}));

describe("LingolixPronunciationProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends one authenticated multipart request and returns normalized analysis", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(successFixture));
    const provider = new LingolixPronunciationProvider({
      apiKey: "secret-test-key",
      fetch,
    });
    const audio = new Blob(["audio bytes"], { type: "audio/webm" });

    const result = await provider.analyze({ audio, fileName: "hello.webm", sentence: "Hello" });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.lingolix.com/api/pronunciation/v3/check",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({ Authorization: "Bearer secret-test-key" });
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("sentence")).toBe("Hello");
    expect(body.get("language_code")).toBe("en");
    expect(body.get("speechdata")).toBeInstanceOf(Blob);
    expect((body.get("speechdata") as File).name).toBe("hello.webm");
    expect(result).toEqual({
      schemaVersion: 1,
      referenceText: "Hello",
      scoredText: "Hello",
      languageCode: "en",
      overall: {
        accuracy: 91,
        completeness: 100,
        speakingRate: 2.4,
      },
      words: expect.any(Array),
    });
  });

  it("reads the server-only API key from the environment", async () => {
    vi.stubEnv("LINGOLIX_API_KEY", " environment-key ");
    const fetch = vi.fn().mockResolvedValue(Response.json(successFixture));

    await new LingolixPronunciationProvider({ fetch }).analyze({
      audio: new Blob(["audio"]),
      fileName: "hello.wav",
      sentence: "Hello",
    });

    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: "Bearer environment-key" });
  });

  it("fails before making a request when the API key is missing", async () => {
    vi.stubEnv("LINGOLIX_API_KEY", "");
    const fetch = vi.fn();
    const provider = new LingolixPronunciationProvider({ fetch });

    await expect(provider.analyze({
      audio: new Blob(["audio"]),
      fileName: "hello.wav",
      sentence: "Hello",
    })).rejects.toThrow("LINGOLIX_API_KEY is not configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not retry or expose provider details on an unsuccessful response", async () => {
    const rawBody = "provider trace with secret-test-key";
    const fetch = vi.fn().mockResolvedValue(new Response(rawBody, { status: 503 }));
    const provider = new LingolixPronunciationProvider({
      apiKey: "secret-test-key",
      fetch,
    });

    const request = provider.analyze({
      audio: new Blob(["audio"]),
      fileName: "hello.wav",
      sentence: "Hello",
    });

    await expect(request).rejects.toThrow("Lingolix request failed (503)");
    await expect(request).rejects.not.toThrow(rawBody);
    await expect(request).rejects.not.toThrow("secret-test-key");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not expose a malformed provider response", async () => {
    const rawBody = { private_provider_detail: "sensitive", words: [] };
    const fetch = vi.fn().mockResolvedValue(Response.json(rawBody));
    const provider = new LingolixPronunciationProvider({
      apiKey: "secret-test-key",
      fetch,
    });

    const request = provider.analyze({
      audio: new Blob(["audio"]),
      fileName: "hello.wav",
      sentence: "Hello",
    });

    await expect(request).rejects.toThrow("Lingolix returned an invalid response");
    await expect(request).rejects.not.toThrow("sensitive");
  });

  it("sanitizes transport errors", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network secret-test-key"));
    const provider = new LingolixPronunciationProvider({
      apiKey: "secret-test-key",
      fetch,
    });

    await expect(provider.analyze({
      audio: new Blob(["audio"]),
      fileName: "hello.wav",
      sentence: "Hello",
    })).rejects.toThrow("Lingolix request failed");
  });
});
