import { describe, expect, it } from "vitest";
import { parseAzureFreePronunciationSummary } from "./azure-pronunciation-free-test";

describe("parseAzureFreePronunciationSummary", () => {
  it("separates Azure fields from locally calculated speaking rate", () => {
    const summary = parseAzureFreePronunciationSummary({
      RecognitionStatus: "Success",
      Offset: 10_000_000,
      Duration: 20_000_000,
      DisplayText: "Hello world.",
      NBest: [{
        Display: "Hello world.",
        Lexical: "hello world",
        Confidence: 0.91,
        PronunciationAssessment: {
          PronScore: 82,
          AccuracyScore: 80,
          FluencyScore: 84,
          ProsodyScore: 79,
        },
        Words: [{
          Word: "hello",
          Offset: 10_000_000,
          Duration: 8_000_000,
          PronunciationAssessment: {
            AccuracyScore: 78,
            ErrorType: "UnexpectedBreak",
            Feedback: {
              Prosody: {
                Break: {
                  ErrorTypes: ["UnexpectedBreak"],
                  UnexpectedBreak: { Confidence: 0.86 },
                  MissingBreak: { Confidence: 0.1 },
                  BreakLength: 3_000_000,
                },
                Intonation: {
                  ErrorTypes: ["Monotone"],
                  Monotone: {
                    Confidence: 0.77,
                    WordPitchSlopeConfidence: 0.7,
                    SyllablePitchDeltaConfidence: 0.6,
                  },
                },
              },
            },
          },
          Syllables: [{
            Syllable: "hɛ",
            Grapheme: "he",
            Offset: 10_000_000,
            Duration: 4_000_000,
            PronunciationAssessment: { AccuracyScore: 75 },
          }],
          Phonemes: [{
            Phoneme: "h",
            Offset: 10_000_000,
            Duration: 2_000_000,
            PronunciationAssessment: {
              AccuracyScore: 74,
              ErrorType: "None",
              NBestPhonemes: [{ Phoneme: "h", Score: 92 }],
            },
          }],
        }, {
          Word: "world",
          Offset: 20_000_000,
          Duration: 8_000_000,
          PronunciationAssessment: { AccuracyScore: 82, ErrorType: "None" },
        }],
      }],
    });

    expect(summary.azure).toMatchObject({
      recognitionStatus: "Success",
      recognizedText: "Hello world.",
      lexicalText: "hello world",
      confidence: 0.91,
      scores: {
        pronunciation: 82,
        accuracy: 80,
        fluency: 84,
        prosody: 79,
      },
      utteranceTiming: { offsetTicks: 10_000_000, durationTicks: 20_000_000 },
    });
    expect(summary.azure.words[0]).toMatchObject({
      word: "hello",
      timing: { offsetTicks: 10_000_000, durationTicks: 8_000_000 },
      accuracyScore: 78,
      errorType: "UnexpectedBreak",
      prosodyFeedback: {
        break: {
          errorTypes: ["UnexpectedBreak"],
          unexpectedBreakConfidence: 0.86,
          missingBreakConfidence: 0.1,
          breakLength: 3_000_000,
        },
        intonation: {
          errorTypes: ["Monotone"],
          monotoneConfidence: 0.77,
          wordPitchSlopeConfidence: 0.7,
          syllablePitchDeltaConfidence: 0.6,
        },
      },
      syllables: [{
        syllable: "hɛ",
        grapheme: "he",
        timing: { offsetTicks: 10_000_000, durationTicks: 4_000_000 },
        accuracyScore: 75,
      }],
      phonemes: [{
        phoneme: "h",
        timing: { offsetTicks: 10_000_000, durationTicks: 2_000_000 },
        accuracyScore: 74,
        errorType: "None",
        alternatives: [{ phoneme: "h", score: 92 }],
      }],
    });
    expect(summary.calculatedLocally).toEqual({
      utteranceDurationMs: 2000,
      recognizedWordCount: 2,
      speakingRateWordsPerMinute: 60,
    });
  });
});
