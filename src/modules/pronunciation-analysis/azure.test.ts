import { describe, expect, it } from "vitest";
import { isAzureEndOfStreamCancellation, mapAzurePronunciationSegments } from "./azure";

describe("isAzureEndOfStreamCancellation", () => {
  it("treats Azure's clean WAV end-of-stream cancellation as successful completion", () => {
    expect(isAzureEndOfStreamCancellation("EndOfStream", "NoError")).toBe(true);
    expect(isAzureEndOfStreamCancellation("Error", "ConnectionFailure")).toBe(false);
  });
});

describe("mapAzurePronunciationSegments", () => {
  it("maps scripted IPA, detected alternatives, timing, and errors into schema v2", () => {
    const result = mapAzurePronunciationSegments([{
      RecognitionStatus: "Success",
      Offset: 1_000_000,
      Duration: 8_000_000,
      DisplayText: "Comfortable.",
      NBest: [{
        Display: "Comfortable.",
        PronunciationAssessment: {
          PronScore: 86,
          AccuracyScore: 80,
          FluencyScore: 92,
          CompletenessScore: 100,
        },
        Words: [{
          Word: "comfortable",
          Offset: 1_000_000,
          Duration: 8_000_000,
          PronunciationAssessment: { AccuracyScore: 80, ErrorType: "Mispronunciation" },
          Syllables: [{
            Syllable: "kʌm",
            Grapheme: "com",
            Offset: 1_000_000,
            Duration: 3_000_000,
            PronunciationAssessment: { AccuracyScore: 62 },
          }],
          Phonemes: [{
            Phoneme: "k",
            Offset: 1_000_000,
            Duration: 1_000_000,
            PronunciationAssessment: {
              AccuracyScore: 61,
              NBestPhonemes: [{ Phoneme: "g", Score: 78 }, { Phoneme: "k", Score: 61 }],
            },
          }, {
            Phoneme: "ʌm",
            Offset: 2_100_000,
            Duration: 1_900_000,
            PronunciationAssessment: {
              AccuracyScore: 63,
              NBestPhonemes: [{ Phoneme: "əm", Score: 70 }],
            },
          }],
        }],
      }],
    }], {
      mode: "SCRIPTED",
      referenceText: "comfortable",
      sourceTranscript: null,
      durationMs: 900,
    });

    expect(result).toMatchObject({
      schemaVersion: 2,
      assessmentMode: "SCRIPTED",
      referenceText: "comfortable",
      scoredText: "Comfortable.",
      languageCode: "en",
      overall: {
        pronunciation: 86,
        accuracy: 80,
        fluency: 92,
        completeness: 100,
        prosody: null,
      },
      words: [{
        text: "comfortable",
        accuracy: 80,
        errorType: "Mispronunciation",
        startMs: 100,
        endMs: 900,
        phonemes: [{
          expectedIpa: "k",
          detectedIpa: "g",
          alternatives: [{ ipa: "g", score: 78 }, { ipa: "k", score: 61 }],
        }, {
          expectedIpa: "\u028Cm",
          detectedIpa: "\u0259m",
          alternatives: [{ ipa: "\u0259m", score: 70 }],
        }],
        syllables: [{
          text: "com",
          expectedIpa: "kʌm",
          detectedIpa: "gəm",
          accuracy: 62,
          startMs: 100,
          endMs: 400,
          isMissing: false,
          isExtra: false,
          phonemes: [{
            expectedIpa: "k",
            detectedIpa: "g",
            alternatives: [{ ipa: "g", score: 78 }, { ipa: "k", score: 61 }],
          }, {
            expectedIpa: "ʌm",
            detectedIpa: "əm",
            alternatives: [{ ipa: "əm", score: 70 }],
          }],
        }],
      }],
    });
  });

  it("aggregates unscripted segments and adds only locally calculated metrics", () => {
    const result = mapAzurePronunciationSegments([
      segment("Hello", 80, 70, 60, 0, 5_000_000),
      segment("world", 100, 90, 80, 15_000_000, 5_000_000),
    ], {
      mode: "UNSCRIPTED",
      referenceText: null,
      sourceTranscript: "Um hello hello world",
      durationMs: 10_000,
    });

    expect(result.referenceText).toBeNull();
    expect(result.overall).toMatchObject({ accuracy: 90, fluency: 80, prosody: 70 });
    expect(result.metrics).toMatchObject({ wpm: 12, longPauseCount: 1, fillerCount: 1, repetitionCount: 1 });
  });
});

function segment(
  word: string,
  accuracy: number,
  fluency: number,
  prosody: number,
  offset: number,
  duration: number,
) {
  return {
    RecognitionStatus: "Success",
    Offset: offset,
    Duration: duration,
    DisplayText: word,
    NBest: [{
      Display: word,
      PronunciationAssessment: {
        PronScore: accuracy,
        AccuracyScore: accuracy,
        FluencyScore: fluency,
        ProsodyScore: prosody,
      },
      Words: [{
        Word: word,
        Offset: offset,
        Duration: duration,
        PronunciationAssessment: { AccuracyScore: accuracy, ErrorType: "None" },
        Syllables: [],
        Phonemes: [],
      }],
    }],
  };
}
