import { describe, expect, it } from "vitest";
import type { PronunciationAnalysisResult } from "../../modules/pronunciation-analysis/types";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import type { SuccessfulPronunciationAttempt } from "../../modules/pronunciation-practice/types";
import { advanceLocally, answerLocally, pronunciationFeedback, withPronunciationAttempt } from "./model";

const items = [{ sessionItemId: "a", review: null, contextResult: null }, { sessionItemId: "b", review: null, contextResult: null }];
const session = (stage: LearningSession["stage"], cursor: number) => ({ stage, cursor, items }) as unknown as LearningSession;
describe("local session position", () => {
  it("adds a scored attempt to its pronunciation item only", () => {
    const attempt = { attemptId: "attempt" } as SuccessfulPronunciationAttempt;
    const base = { pronunciation: { status: "IN_PROGRESS", items: [{ sessionItemId: "a", latestSuccessfulAttempt: null }, { sessionItemId: "b", latestSuccessfulAttempt: null }] } } as unknown as LearningSession;
    const next = withPronunciationAttempt(base, "b", attempt, "COMPLETED");
    expect(next.pronunciation.items.map(item => item.latestSuccessfulAttempt)).toEqual([null, attempt]);
    expect(next.pronunciation.status).toBe("COMPLETED");
    expect(withPronunciationAttempt(base, "a", attempt, null).pronunciation.status).toBe("IN_PROGRESS");
  });
  it("moves through a stage and into the next one", () => {
    expect(advanceLocally(session("LEARN", 0))).toMatchObject({ stage: "LEARN", cursor: 1 });
    expect(advanceLocally(session("LEARN", 1))).toMatchObject({ stage: "PRONOUNCE", cursor: 0 });
    expect(advanceLocally(session("PRONOUNCE", 1))).toMatchObject({ stage: "RECALL", cursor: 0 });
  });
  it("records an answer for the stage it belongs to", () => {
    expect(answerLocally(session("RECALL", 0), "a", true).items[0]).toMatchObject({ review: "REMEMBERED", contextResult: null });
    expect(answerLocally(session("CONTEXT", 0), "b", false).items[1]).toMatchObject({ review: null, contextResult: "NOT_REMEMBERED" });
    expect(answerLocally(session("RECALL", 0), "a", true).cursor).toBe(1);
  });
});

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
