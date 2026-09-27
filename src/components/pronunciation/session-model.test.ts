import { describe, expect, it } from "vitest";
import type { PronunciationSyllableAnalysis, PronunciationAnalysisResult } from "../../modules/pronunciation-analysis/types";
import type { PronunciationSessionItem } from "../../modules/pronunciation-practice/types";
import { composeSyllables, firstPendingIndex, summarizeItems, problemSyllables } from "./session-model";

export function syllable(text: string, accuracy = 90): PronunciationSyllableAnalysis {
  return { text, accuracy, completeness: 100, expectedIpa: null, detectedIpa: null, pitch: "UNKNOWN", durationMs: null, startMs: null, endMs: null, isMissing: false, isExtra: false };
}
export function item(id: string, score: number | null, parts = [syllable("word")]): PronunciationSessionItem {
  const result: PronunciationAnalysisResult = { schemaVersion: 1, referenceText: "word", scoredText: "word", languageCode: "en", overall: { accuracy: score ?? 0, completeness: 100, speakingRate: null }, words: [{ text: "word", syllables: parts, accuracy: score ?? 0, completeness: 100, startMs: null, endMs: null, charStart: 0, charEnd: 4 }] };
  return { sessionItemId: id, vocabularyItemId: id, sequenceNo: 1, snapshot: { word: id, pronunciationIpa: "/wɜːd/", meaningVi: "từ", level: "BEGINNER" }, latestSuccessfulAttempt: score === null ? null : { attemptId: id, provider: "test", result, score, scoreBand: "GOOD", completedAt: "2026-09-27T00:00:00Z" } };
}

describe("pronunciation learning state", () => {
  it("resumes the first item without a successful attempt, and finishes only when none remain", () => {
    expect(firstPendingIndex([item("a", 90), item("b", null), item("c", 80)])).toBe(1);
    expect(firstPendingIndex([item("a", 90)])).toBe(-1);
  });
  it("keeps original spelling while safely joining case-normalized letter segments", () => {
    expect(composeSyllables("Banana", [syllable("ba"), syllable("na"), syllable("na")])).toEqual(["Ba", "na", "na"]);
    expect(composeSyllables("banana", [syllable("bə"), syllable("nɑː"), syllable("nə")])).toBeNull();
    expect(composeSyllables("ice-cream", [syllable("ice"), syllable("cream")])).toBeNull();
    expect(composeSyllables("a", [syllable(""), syllable("a")])).toBeNull();
    expect(composeSyllables("word", [{ ...syllable("word"), isExtra: true }])).toBeNull();
  });
  it("distinguishes score bands from the broader weak-practice selection", () => {
    const items = [item("good", 85), item("practice", 70), item("weak", 69), item("missing", 95, [{ ...syllable("mis"), isMissing: true }]), item("pending", null)];
    expect(summarizeItems(items)).toMatchObject({ averageScore: 79.75, completedCount: 4, goodCount: 2, practiceCount: 1, weakCount: 1 });
    expect(summarizeItems(items).weakWords).toEqual(["practice", "weak", "missing"]);
    expect(problemSyllables(items[3])).toEqual([{ ...syllable("mis"), isMissing: true }]);
  });
});
