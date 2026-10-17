import { describe, expect, it } from "vitest";

import { parseAzurePronunciationSummary } from "./azure-pronunciation-test";

describe("parseAzurePronunciationSummary", () => {
  it("extracts pronunciation, syllable, phoneme, detected IPA, and error details", () => {
    const summary = parseAzurePronunciationSummary({
      RecognitionStatus: "Success",
      NBest: [{
        Display: "comfortable",
        PronunciationAssessment: {
          AccuracyScore: 82,
          FluencyScore: 91,
          CompletenessScore: 100,
          PronScore: 86,
        },
        Words: [{
          Word: "comfortable",
          PronunciationAssessment: { AccuracyScore: 82, ErrorType: "Mispronunciation" },
          Syllables: [{
            Syllable: "kʌm",
            Grapheme: "com",
            PronunciationAssessment: { AccuracyScore: 75 },
          }],
          Phonemes: [{
            Phoneme: "k",
            PronunciationAssessment: {
              AccuracyScore: 70,
              NBestPhonemes: [
                { Phoneme: "ɡ", Score: 88 },
                { Phoneme: "k", Score: 70 },
              ],
            },
          }],
        }],
      }],
    });

    expect(summary).toEqual({
      recognizedText: "comfortable",
      overallPronunciationScore: 86,
      accuracyScore: 82,
      fluencyScore: 91,
      completenessScore: 100,
      words: [{
        word: "comfortable",
        accuracyScore: 82,
        errorType: "Mispronunciation",
        syllables: [{ syllable: "kʌm", grapheme: "com", accuracyScore: 75 }],
        phonemes: [{
          expected: "k",
          detected: "ɡ",
          accuracyScore: 70,
          errorType: null,
          alternatives: [
            { phoneme: "ɡ", score: 88 },
            { phoneme: "k", score: 70 },
          ],
        }],
      }],
    });
  });
});
