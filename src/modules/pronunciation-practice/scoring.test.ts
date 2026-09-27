import { describe, expect, it } from "vitest";
import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import {
  classifyPronunciationScore,
  isWeakPronunciationResult,
  summarizePronunciationItems,
} from "./scoring";

function result(
  overallAccuracy: number,
  syllables: Array<Partial<PronunciationAnalysisResult["words"][number]["syllables"][number]>> = [],
): PronunciationAnalysisResult {
  return {
    schemaVersion: 1,
    referenceText: "hello",
    scoredText: "hello",
    languageCode: "en",
    overall: { speakingRate: 2.1, accuracy: overallAccuracy, completeness: 100 },
    words: [{
      text: "hello",
      accuracy: overallAccuracy,
      completeness: 100,
      startMs: 0,
      endMs: 500,
      charStart: 0,
      charEnd: 5,
      syllables: syllables.map((entry) => ({
        text: "hel",
        expectedIpa: "hə",
        detectedIpa: "hə",
        accuracy: 90,
        completeness: 100,
        pitch: "FLAT",
        durationMs: 200,
        startMs: 0,
        endMs: 200,
        isMissing: false,
        isExtra: false,
        ...entry,
      })),
    }],
  };
}

describe("classifyPronunciationScore", () => {
  it.each([
    [100, "GOOD"],
    [85, "GOOD"],
    [84.99, "PRACTICE"],
    [70, "PRACTICE"],
    [69.99, "WEAK"],
  ] as const)("classifies %s as %s", (score, expected) => {
    expect(classifyPronunciationScore(score)).toBe(expected);
  });
});

describe("isWeakPronunciationResult", () => {
  it("marks overall accuracy below 80 as weak", () => {
    expect(isWeakPronunciationResult(result(79.99))).toBe(true);
    expect(isWeakPronunciationResult(result(80))).toBe(false);
  });

  it("marks a low, missing, or extra syllable as weak", () => {
    expect(isWeakPronunciationResult(result(95, [{ accuracy: 69.99 }]))).toBe(true);
    expect(isWeakPronunciationResult(result(95, [{ isMissing: true }]))).toBe(true);
    expect(isWeakPronunciationResult(result(95, [{ isExtra: true }]))).toBe(true);
    expect(isWeakPronunciationResult(result(95, [{ accuracy: 70 }]))).toBe(false);
  });
});

describe("summarizePronunciationItems", () => {
  it("averages successful attempts and counts score bands and weak words", () => {
    expect(summarizePronunciationItems([
      { word: "hello", result: result(90) },
      { word: "world", result: result(75) },
      { word: "again", result: result(60) },
      { word: "pending", result: null },
    ])).toEqual({
      averageScore: 75,
      completedCount: 3,
      goodCount: 1,
      practiceCount: 1,
      weakCount: 1,
      weakWords: ["world", "again"],
    });
  });

  it("returns a null average when no item has a completed attempt", () => {
    expect(summarizePronunciationItems([{ word: "hello", result: null }])).toEqual({
      averageScore: null,
      completedCount: 0,
      goodCount: 0,
      practiceCount: 0,
      weakCount: 0,
      weakWords: [],
    });
  });
});
