import { afterEach, describe, expect, it, vi } from "vitest";
import { assessmentJsonSchema } from "../assessment/schema";
import { NonEnglishTranscriptError, OpenAIProvider, hasNonLatinLetters, transcriptionPrompt } from "./openai";

describe("OpenAIProvider.assess", () => {
  it("requests only CEFR, feedback, and recommendation for Quick Check", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: "{}" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await new OpenAIProvider().assess("Three answers", "GENERAL", "QUICK_CHECK");
    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(request.text.format.name).toBe("quick_speaking_check");
    expect(request.text.format.schema.required).toEqual(["estimated_cefr", "feedback", "recommendation"]);
    expect(request.text.format.schema.additionalProperties).toBe(false);
    expect(request.instructions).toContain("no audio evidence");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it("uses the General schema and forbids bands and pronunciation claims", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: "{}" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await new OpenAIProvider().assess("Question 1: Work", "GENERAL");

    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(request.text.format.name).toBe("general_speaking_assessment");
    expect(request.text.format.schema.required).not.toContain("estimated_band");
    expect(request.text.format.schema.properties.recommendation_tags).not.toHaveProperty("uniqueItems");
    expect(request.instructions).toMatch(/must not return.*band/i);
    expect(request.instructions).toMatch(/never assess.*pronunciation/i);
    expect(request.instructions).toMatch(/machine-generated audio evidence/i);
    expect(request.instructions).toMatch(/do not repeat.*numeric/i);
  });

  it("keeps the existing IELTS schema name, schema, and instructions", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: "{}" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await new OpenAIProvider().assess("Question 1: Home", "IELTS");

    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(request.text.format.name).toBe("ielts_speaking_assessment");
    expect(request.text.format.schema).toEqual(assessmentJsonSchema);
    expect(request.instructions).toContain("You are an IELTS Speaking coach.");
  });
});

describe("OpenAIProvider.transcribe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });
  const reply = (text: string) => new Response(JSON.stringify({ text }), { status: 200 });

  it("sends English and the line being answered as the STT prompt", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValue(reply("Orange juice, please."));
    vi.stubGlobal("fetch", fetch);
    await expect(new OpenAIProvider().transcribe(new Blob(["a"]), "a.webm", { context: "What can I get for you?" })).resolves.toBe("Orange juice, please.");
    const form = fetch.mock.calls[0]?.[1]?.body as FormData;
    expect(form.get("language")).toBe("en");
    expect(form.get("prompt")).toBe(transcriptionPrompt("What can I get for you?"));
    expect(form.get("prompt")).toContain('replying to: "What can I get for you?"');
  });

  it("retries once when the transcript comes back in another script", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetch = vi.fn().mockResolvedValueOnce(reply("非常饿")).mockResolvedValueOnce(reply("Very hungry."));
    vi.stubGlobal("fetch", fetch);
    await expect(new OpenAIProvider().transcribe(new Blob(["a"]), "a.webm")).resolves.toBe("Very hungry.");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects a transcript that stays in another script instead of saving it", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => reply("歐洲不利斯")));
    await expect(new OpenAIProvider().transcribe(new Blob(["a"]), "a.webm")).rejects.toBeInstanceOf(NonEnglishTranscriptError);
  });
});

describe("hasNonLatinLetters", () => {
  it("flags other scripts but keeps Vietnamese names, digits and punctuation", () => {
    expect(hasNonLatinLetters("非常饿")).toBe(true);
    expect(hasNonLatinLetters("Привет")).toBe(true);
    expect(hasNonLatinLetters("Do you know Sơn Tùng M-TP? Room 205, café!")).toBe(false);
    expect(hasNonLatinLetters("")).toBe(false);
  });
});
