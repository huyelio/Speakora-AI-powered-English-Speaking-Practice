import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";

const LANGUAGE = "en-US";
const TICKS_PER_MILLISECOND = 10_000;
const TICKS_PER_MINUTE = 600_000_000;

type JsonRecord = Record<string, unknown>;
type Timing = { offsetTicks: number | null; durationTicks: number | null };

export type AzureFreePronunciationSummary = {
  azure: {
    recognitionStatus: string | null;
    recognizedText: string | null;
    lexicalText: string | null;
    confidence: number | null;
    signalToNoiseRatio: number | null;
    scores: {
      pronunciation: number | null;
      accuracy: number | null;
      fluency: number | null;
      prosody: number | null;
      completeness: number | null;
    };
    utteranceTiming: Timing;
    contentAssessment: JsonRecord | null;
    words: Array<{
      word: string | null;
      timing: Timing;
      accuracyScore: number | null;
      errorType: string | null;
      prosodyFeedback: {
        break: {
          errorTypes: string[];
          unexpectedBreakConfidence: number | null;
          missingBreakConfidence: number | null;
          breakLength: number | null;
        } | null;
        intonation: {
          errorTypes: string[];
          monotoneConfidence: number | null;
          wordPitchSlopeConfidence: number | null;
          syllablePitchDeltaConfidence: number | null;
        } | null;
      } | null;
      syllables: Array<{
        syllable: string | null;
        grapheme: string | null;
        timing: Timing;
        accuracyScore: number | null;
      }>;
      phonemes: Array<{
        phoneme: string | null;
        timing: Timing;
        accuracyScore: number | null;
        errorType: string | null;
        alternatives: Array<{ phoneme: string | null; score: number | null }>;
      }>;
    }>;
  };
  calculatedLocally: {
    utteranceDurationMs: number | null;
    recognizedWordCount: number;
    speakingRateWordsPerMinute: number | null;
  };
};

export function parseAzureFreePronunciationSummary(
  raw: unknown,
): AzureFreePronunciationSummary {
  const root = record(raw);
  const best = records(root?.NBest)[0];
  const overall = record(best?.PronunciationAssessment);
  const durationTicks = finiteNumber(root?.Duration);
  const words = records(best?.Words).map((word) => {
    const assessment = record(word.PronunciationAssessment);
    const feedback = record(assessment?.Feedback);
    const prosody = record(feedback?.Prosody);
    const breakFeedback = record(prosody?.Break);
    const intonation = record(prosody?.Intonation);
    const unexpectedBreak = record(breakFeedback?.UnexpectedBreak);
    const missingBreak = record(breakFeedback?.MissingBreak);
    const monotone = record(intonation?.Monotone);

    return {
      word: nonEmptyText(word.Word),
      timing: timing(word),
      accuracyScore: finiteNumber(assessment?.AccuracyScore),
      errorType: nonEmptyText(assessment?.ErrorType),
      prosodyFeedback: prosody ? {
        break: breakFeedback ? {
          errorTypes: stringArray(breakFeedback.ErrorTypes),
          unexpectedBreakConfidence: finiteNumber(unexpectedBreak?.Confidence),
          missingBreakConfidence: finiteNumber(missingBreak?.Confidence),
          breakLength: finiteNumber(breakFeedback.BreakLength),
        } : null,
        intonation: intonation ? {
          errorTypes: stringArray(intonation.ErrorTypes),
          monotoneConfidence: finiteNumber(monotone?.Confidence),
          wordPitchSlopeConfidence: finiteNumber(monotone?.WordPitchSlopeConfidence),
          syllablePitchDeltaConfidence: finiteNumber(monotone?.SyllablePitchDeltaConfidence),
        } : null,
      } : null,
      syllables: records(word.Syllables).map((syllable) => ({
        syllable: nonEmptyText(syllable.Syllable),
        grapheme: nonEmptyText(syllable.Grapheme),
        timing: timing(syllable),
        accuracyScore: finiteNumber(record(syllable.PronunciationAssessment)?.AccuracyScore),
      })),
      phonemes: records(word.Phonemes).map((phoneme) => {
        const phonemeAssessment = record(phoneme.PronunciationAssessment);
        return {
          phoneme: nonEmptyText(phoneme.Phoneme),
          timing: timing(phoneme),
          accuracyScore: finiteNumber(phonemeAssessment?.AccuracyScore),
          errorType: nonEmptyText(phonemeAssessment?.ErrorType),
          alternatives: records(phonemeAssessment?.NBestPhonemes).map((candidate) => ({
            phoneme: nonEmptyText(candidate.Phoneme),
            score: finiteNumber(candidate.Score),
          })),
        };
      }),
    };
  });

  return {
    azure: {
      recognitionStatus: nonEmptyText(root?.RecognitionStatus),
      recognizedText: nonEmptyText(best?.Display) ?? nonEmptyText(root?.DisplayText),
      lexicalText: nonEmptyText(best?.Lexical),
      confidence: finiteNumber(best?.Confidence),
      signalToNoiseRatio: finiteNumber(best?.SNR),
      scores: {
        pronunciation: finiteNumber(overall?.PronScore),
        accuracy: finiteNumber(overall?.AccuracyScore),
        fluency: finiteNumber(overall?.FluencyScore),
        prosody: finiteNumber(overall?.ProsodyScore),
        completeness: finiteNumber(overall?.CompletenessScore),
      },
      utteranceTiming: timing(root),
      contentAssessment: record(best?.ContentAssessment),
      words,
    },
    calculatedLocally: {
      utteranceDurationMs: durationTicks === null
        ? null
        : round(durationTicks / TICKS_PER_MILLISECOND, 1),
      recognizedWordCount: words.length,
      speakingRateWordsPerMinute: durationTicks && durationTicks > 0
        ? round(words.length * TICKS_PER_MINUTE / durationTicks, 1)
        : null,
    },
  };
}

async function main() {
  loadRepositoryEnv();

  const audioPath = process.argv[2] ? path.resolve(process.argv[2]) : "";
  if (!audioPath) {
    throw new Error("Usage: npx tsx scripts/azure-pronunciation-free-test.ts <audio.wav>");
  }
  if (!existsSync(audioPath) || !statSync(audioPath).isFile()) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  if (path.extname(audioPath).toLowerCase() !== ".wav") {
    throw new Error("Expected a .wav file containing PCM audio.");
  }

  const speechConfig = speechSdk.SpeechConfig.fromSubscription(
    requiredEnv("AZURE_SPEECH_KEY"),
    requiredEnv("AZURE_SPEECH_REGION"),
  );
  speechConfig.speechRecognitionLanguage = LANGUAGE;
  speechConfig.outputFormat = speechSdk.OutputFormat.Detailed;

  const audioConfig = speechSdk.AudioConfig.fromWavFileInput(
    readFileSync(audioPath),
    path.basename(audioPath),
  );
  const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
  const pronunciationConfig = speechSdk.PronunciationAssessmentConfig.fromJSON(
    JSON.stringify({
      gradingSystem: "HundredMark",
      granularity: "Phoneme",
      enableMiscue: false,
      phonemeAlphabet: "IPA",
      nBestPhonemeCount: 5,
    }),
  );
  pronunciationConfig.enableProsodyAssessment = true;
  pronunciationConfig.applyTo(recognizer);

  try {
    const result = await recognizeOnce(recognizer);
    const rawJson = result.properties.getProperty(
      speechSdk.PropertyId.SpeechServiceResponse_JsonResult,
    );
    if (!rawJson) throw new Error("Azure returned no raw pronunciation JSON.");
    const raw: unknown = JSON.parse(rawJson);

    // Raw provider output intentionally comes first so this script can be used
    // to inspect Azure behavior without the parsed view hiding any fields.
    console.log(JSON.stringify(raw, null, 2));

    if (result.reason !== speechSdk.ResultReason.RecognizedSpeech) {
      const cancellation = speechSdk.CancellationDetails.fromResult(result);
      throw new Error(
        `Azure recognition failed (${speechSdk.ResultReason[result.reason]}): ${cancellation.errorDetails || cancellation.reason}`,
      );
    }

    console.log("\n=== Parsed free-speaking pronunciation summary ===");
    console.log(JSON.stringify(parseAzureFreePronunciationSummary(raw), null, 2));
    console.log("\nNotes: azure contains fields returned directly by Azure. calculatedLocally is derived from Azure timing and recognized-word count; Azure did not return it as a metric.");
  } finally {
    recognizer.close();
    audioConfig.close();
    speechConfig.close();
  }
}

function recognizeOnce(
  recognizer: speechSdk.SpeechRecognizer,
): Promise<speechSdk.SpeechRecognitionResult> {
  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(resolve, reject);
  });
}

function loadRepositoryEnv() {
  try {
    loadEnvFile(path.resolve(".env"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function requiredEnv(name: "AZURE_SPEECH_KEY" | "AZURE_SPEECH_REGION") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured in .env.`);
  return value;
}

function timing(value: JsonRecord | null): Timing {
  return {
    offsetTicks: finiteNumber(value?.Offset),
    durationTicks: finiteNumber(value?.Duration),
  };
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function records(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<JsonRecord[]>((items, item) => {
    const parsed = record(item);
    if (parsed) items.push(parsed);
    return items;
  }, []);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
