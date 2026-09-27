import { describe, expect, it } from "vitest";
import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import { mapSpeakingPronunciationFeedback } from "./pronunciation-feedback";

describe("mapSpeakingPronunciationFeedback", () => {
  it("reports unavailable when no successful Lingolix result was stored", () => {
    expect(mapSpeakingPronunciationFeedback([{}, { pronunciation: { provider: "other" } }])).toEqual({
      available: false,
      summary: "Chưa thể phân tích phát âm cho phiên này",
      practiceWords: [],
    });
  });

  it("reports clear speech without exposing scores", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(92, [word("clearly", 90)])),
    ]);

    expect(feedback).toEqual({
      available: true,
      summary: "Phát âm nhìn chung rõ ràng",
      practiceWords: [],
    });
    expect(JSON.stringify(feedback)).not.toMatch(/accuracy|92|90/);
  });

  it("keeps the first three unique words needing attention in provider order", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(79, [
        word("world", 65),
        word("hello", 90, [{ accuracy: 60 }]),
        word("world", 50),
        word("missing", 90, [{ isMissing: true }]),
        word("fourth", 40),
      ])),
    ]);

    expect(feedback).toEqual({
      available: true,
      summary: "Một số từ cần chú ý",
      practiceWords: ["world", "hello", "missing"],
    });
  });
});

function metadata(value: PronunciationAnalysisResult) {
  return { pronunciation: { provider: "lingolix", result: value } };
}

function result(overallAccuracy: number, words: PronunciationAnalysisResult["words"]): PronunciationAnalysisResult {
  return {
    schemaVersion: 1,
    referenceText: words.map((item) => item.text).join(" "),
    scoredText: words.map((item) => item.text).join(" "),
    languageCode: "en",
    overall: { accuracy: overallAccuracy, completeness: 100, speakingRate: null },
    words,
  };
}

function word(
  text: string,
  accuracy: number,
  syllableOverrides: Array<Partial<PronunciationAnalysisResult["words"][number]["syllables"][number]>> = [{}],
): PronunciationAnalysisResult["words"][number] {
  return {
    text,
    accuracy,
    completeness: 100,
    startMs: null,
    endMs: null,
    charStart: 0,
    charEnd: text.length,
    syllables: syllableOverrides.map((override) => ({
      text,
      expectedIpa: null,
      detectedIpa: null,
      accuracy: 90,
      completeness: 100,
      pitch: "UNKNOWN",
      durationMs: null,
      startMs: null,
      endMs: null,
      isMissing: false,
      isExtra: false,
      ...override,
    })),
  };
}
