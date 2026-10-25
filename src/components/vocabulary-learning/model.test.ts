import { describe, expect, it } from "vitest";
import type { PronunciationAnalysisResult } from "../../modules/pronunciation-analysis/types";
import { pronunciationFeedback } from "./model";

function result(accuracy: number, syllable = 90): PronunciationAnalysisResult {
  return { schemaVersion: 1, referenceText: "test", scoredText: "test", languageCode: "en", overall: { accuracy, completeness: 100, speakingRate: null }, words: [{ text: "test", accuracy, completeness: 100, charStart: 0, charEnd: 4, startMs: null, endMs: null, syllables: [{ text: "test", accuracy: syllable, completeness: 100, expectedIpa: null, detectedIpa: null, pitch: "UNKNOWN", durationMs: null, startMs: null, endMs: null, isMissing: false, isExtra: false }] }] };
}
describe("V2 pronunciation feedback", () => {
  it("uses the backend overall threshold as well as syllable evidence", () => {
    expect(pronunciationFeedback(result(79))).toBe("WEAK");
    expect(pronunciationFeedback(result(90, 69))).toBe("WEAK");
    expect(pronunciationFeedback(result(80, 70))).toBe("GOOD");
  });
  it("never calls an empty or invalid assessment successful", () => {
    expect(pronunciationFeedback({ ...result(100), words: [] })).toBe("UNKNOWN");
    expect(pronunciationFeedback(result(NaN))).toBe("UNKNOWN");
    expect(pronunciationFeedback(null)).toBe("UNKNOWN");
  });
  it("requires valid syllable evidence for every assessed word", () => {
    const mixed = result(90);
    mixed.words.push({ ...mixed.words[0], syllables: [] });
    expect(pronunciationFeedback(mixed)).toBe("UNKNOWN");
    const invalid = result(90);
    delete (invalid.words[0].syllables[0] as { isMissing?: boolean }).isMissing;
    expect(pronunciationFeedback(invalid)).toBe("UNKNOWN");
  });
});
