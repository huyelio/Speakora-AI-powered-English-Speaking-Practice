import { describe, expect, it } from "vitest";
import successFixture from "./fixtures/lingolix-word-success.json";
import { parsePronunciationAnalysis } from "./schema";

describe("parsePronunciationAnalysis", () => {
  it("normalizes provider scores and field names without deriving duration", () => {
    const result = parsePronunciationAnalysis(successFixture);

    expect(result).toEqual({
      scoredText: "Hello",
      overall: {
        speakingRate: 2.4,
        accuracy: 91,
        completeness: 100,
      },
      words: [
        {
          text: "Hello",
          accuracy: 91,
          completeness: 100,
          startMs: 120,
          endMs: 640,
          charStart: 0,
          charEnd: 5,
          syllables: [
            {
              text: "hel",
              expectedIpa: "hə",
              detectedIpa: "hɛ",
              accuracy: 82,
              completeness: 100,
              pitch: "HIGH",
              durationMs: 210,
              startMs: 120,
              endMs: 300,
              isMissing: false,
              isExtra: false,
            },
            {
              text: "lo",
              expectedIpa: "loʊ",
              detectedIpa: "loʊ",
              accuracy: 100,
              completeness: 100,
              pitch: "FLAT",
              durationMs: 300,
              startMs: 310,
              endMs: 640,
              isMissing: false,
              isExtra: false,
            },
          ],
        },
      ],
    });
  });

  it("preserves absent provider timings as null", () => {
    const input = structuredClone(successFixture) as Record<string, any>;
    input.words[0].start_ms = null;
    input.words[0].end_ms = null;
    input.words[0].syllables[0].duration_ms = null;
    input.words[0].syllables[0].start_ms = null;
    input.words[0].syllables[0].end_ms = null;
    input.words[0].syllables[0].pitch = "unknown";

    const result = parsePronunciationAnalysis(input);

    expect(result.words[0]).toMatchObject({ startMs: null, endMs: null });
    expect(result.words[0]?.syllables[0]).toMatchObject({
      durationMs: null,
      startMs: null,
      endMs: null,
      pitch: "UNKNOWN",
    });
  });

  it.each([
    ["non-object response", null],
    ["missing words array", { ...successFixture, words: undefined }],
    ["missing syllables array", {
      ...successFixture,
      words: [{ ...successFixture.words[0], syllables: undefined }],
    }],
    ["out-of-range score", { ...successFixture, accuracy: 1.01 }],
    ["not-a-number score", { ...successFixture, accuracy: Number.NaN }],
    ["negative timing", {
      ...successFixture,
      words: [{ ...successFixture.words[0], start_ms: -1 }],
    }],
    ["unknown pitch value", {
      ...successFixture,
      words: [{
        ...successFixture.words[0],
        syllables: [{ ...successFixture.words[0].syllables[0], pitch: "rising" }],
      }],
    }],
    ["prototype-inherited pitch value", {
      ...successFixture,
      words: [{
        ...successFixture.words[0],
        syllables: [{ ...successFixture.words[0].syllables[0], pitch: "__proto__" }],
      }],
    }],
    ["reversed word timing", {
      ...successFixture,
      words: [{ ...successFixture.words[0], start_ms: 640, end_ms: 120 }],
    }],
    ["reversed syllable timing", {
      ...successFixture,
      words: [{
        ...successFixture.words[0],
        syllables: [{ ...successFixture.words[0].syllables[0], start_ms: 300, end_ms: 120 }],
      }],
    }],
  ])("rejects %s", (_case, value) => {
    expect(() => parsePronunciationAnalysis(value)).toThrow("Invalid pronunciation analysis response");
  });
});
