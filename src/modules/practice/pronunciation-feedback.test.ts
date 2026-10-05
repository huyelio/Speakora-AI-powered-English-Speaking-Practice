import { describe, expect, it } from "vitest";
import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import { mapSpeakingPronunciationFeedback } from "./pronunciation-feedback";

describe("mapSpeakingPronunciationFeedback", () => {
  it("reports unavailable when no successful Lingolix result was stored", () => {
    expect(mapSpeakingPronunciationFeedback([{}, { pronunciation: { provider: "other" } }])).toMatchObject({
      available: false,
      status: "UNAVAILABLE",
      analyzedAnswerCount: 0,
      totalAnswerCount: 2,
      wordDetails: [],
      summary: "Chưa thể phân tích phát âm cho phiên này",
      practiceWords: [],
    });
  });

  it("reports clear speech without exposing scores", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(92, [word("clearly", 90)])),
    ]);

    expect(feedback).toMatchObject({
      available: true,
      status: "CLEAR",
      summary: "Các bản ghi đã phân tích nhìn chung rõ ràng",
      practiceWords: [],
    });
    expect(JSON.stringify(feedback)).not.toMatch(/accuracy|92|90/);
  });

  it("ranks gaps before lower accuracy and deduplicates the worst occurrence", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(79, [
        word("world", 65),
        word("hello", 90, [{ accuracy: 60 }]),
        word("world", 50),
        word("missing", 90, [{ isMissing: true }]),
        word("fourth", 40),
      ])),
    ]);

    expect(feedback).toMatchObject({
      available: true,
      summary: "Một số từ cần chú ý",
      practiceWords: ["missing", "fourth", "world"],
    });
  });

  it("keeps all syllable details from the selected occurrence without raw scores", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(79, [word("World", 65, [{ text: "old", expectedIpa: "old" }])])),
      metadata(result(90, [word("world", 50, [{ text: "world", expectedIpa: "wɜːld", detectedIpa: "wɔːld", accuracy: 60 }])])),
    ]);
    expect(feedback.practiceWords).toEqual(["world"]);
    expect(feedback.wordDetails).toMatchObject([{
      word: "world", syllables: [{ text: "world", expectedIpa: "wɜːld", detectedIpa: "wɔːld", status: "ATTENTION", isMissing: false, isExtra: false }],
    }]);
    expect(JSON.stringify(feedback)).not.toMatch(/accuracy|completeness|pitch|speakingRate|durationMs|startMs|endMs/);
  });

  it.each([
    ["MISSING_SOUND", 60, [{ isMissing: true, isExtra: true, accuracy: 40 }]],
    ["EXTRA_SOUND", 60, [{ isExtra: true, accuracy: 40 }]],
    ["SYLLABLE_ATTENTION", 60, [{ accuracy: 40 }]],
    ["WORD_ATTENTION", 60, [{ accuracy: 90 }]],
    ["WORD_ATTENTION", 60, []],
  ] as const)("projects %s from stored evidence without changing ranking or revealing scores", (reason, accuracy, syllables) => {
    const feedback = mapSpeakingPronunciationFeedback([metadata(result(90, [word("practice", accuracy, [...syllables])]))]);
    expect(feedback.wordDetails[0].practiceReason).toBe(reason);
    expect(feedback.practiceWords).toEqual(["practice"]);
    expect(JSON.stringify(feedback)).not.toMatch(/accuracy|completeness|pitch|speakingRate|startMs|endMs/);
  });

  it("breaks ties by attention syllable count then preserves provider order", () => {
    const feedback = mapSpeakingPronunciationFeedback([metadata(result(90, [
      word("first", 60, [{ accuracy: 60 }]),
      word("second", 60, [{ accuracy: 60 }, { accuracy: 65 }]),
      word("third", 60, [{ accuracy: 60 }]),
      word("fourth", 60, [{ accuracy: 60 }]),
    ]))]);
    expect(feedback.practiceWords).toEqual(["second", "first", "third"]);
  });

  it("uses strict thresholds and retains attention without inventing a weak word", () => {
    expect(mapSpeakingPronunciationFeedback([metadata(result(80, [word("fine", 70, [{ accuracy: 70 }])]))]).status).toBe("CLEAR");
    expect(mapSpeakingPronunciationFeedback([metadata(result(79, [word("fine", 90)]))])).toMatchObject({ status: "ATTENTION", practiceWords: [], wordDetails: [] });
  });

  it("counts only valid analyzed answers and handles missing display fields safely", () => {
    const weak = word(" weak ", 60, [{ accuracy: 65 }]);
    const part = weak.syllables[0] as unknown as Record<string, unknown>;
    delete part.text;
    part.expectedIpa = { invalid: true };
    part.detectedIpa = " ";
    const feedback = mapSpeakingPronunciationFeedback([{}, metadata(result(90, [weak])), { pronunciation: { provider: "lingolix", result: { schemaVersion: 1 } } }], 5);
    expect(feedback).toMatchObject({ analyzedAnswerCount: 1, totalAnswerCount: 5, practiceWords: ["weak"] });
    expect(feedback.wordDetails[0].syllables[0]).toMatchObject({ text: null, expectedIpa: null, detectedIpa: null, status: "ATTENTION" });
  });

  it("keeps words without syllables and skips invalid numeric data", () => {
    const feedback = mapSpeakingPronunciationFeedback([
      metadata(result(90, [word("bare", 60, [])])),
      metadata(result(Number.NaN, [word("bad", 10)])),
      metadata(result(90, [word("bad", 101)])),
    ]);
    expect(feedback).toMatchObject({ analyzedAnswerCount: 1, practiceWords: ["bare"], wordDetails: [{ word: "bare", syllables: [] }] });
  });

  it("keeps attention for an unlabelled weak segment without inventing a word", () => {
    const feedback = mapSpeakingPronunciationFeedback([metadata(result(90, [word(" ", 20)]))]);
    expect(feedback).toMatchObject({ status: "ATTENTION", available: true, practiceWords: [], wordDetails: [] });
  });

  it("selects both missing and extra segments before plain low-accuracy words", () => {
    const feedback = mapSpeakingPronunciationFeedback([metadata(result(90, [
      word("low", 10), word("extra", 90, [{ isExtra: true }]), word("missing", 80, [{ isMissing: true }]),
    ]))]);
    expect(feedback.practiceWords).toEqual(["missing", "extra", "low"]);
    expect(feedback.wordDetails[1].syllables[0]).toMatchObject({ status: "ATTENTION", isExtra: true });
  });

  it("rejects malformed syllable scores and flags instead of emitting false reassurance", () => {
    const bad = word("bad", 50);
    (bad.syllables[0] as unknown as Record<string, unknown>).isMissing = "false";
    const feedback = mapSpeakingPronunciationFeedback([metadata(result(90, [bad]))]);
    expect(feedback).toMatchObject({ status: "UNAVAILABLE", analyzedAnswerCount: 0, wordDetails: [] });
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
