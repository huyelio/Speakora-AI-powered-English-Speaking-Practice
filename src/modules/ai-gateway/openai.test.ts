import { afterEach, describe, expect, it, vi } from "vitest";
import { assessmentJsonSchema } from "../assessment/schema";
import { OpenAIProvider } from "./openai";

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
