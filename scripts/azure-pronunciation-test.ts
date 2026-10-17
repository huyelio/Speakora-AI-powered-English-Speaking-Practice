import { existsSync, readFileSync, statSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";

const REFERENCE_TEXT = "comfortable";
const LANGUAGE = "en-US";

type JsonRecord = Record<string, unknown>;

export type AzurePronunciationSummary = {
  recognizedText: string | null;
  overallPronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  words: Array<{
    word: string | null;
    accuracyScore: number | null;
    errorType: string | null;
    syllables: Array<{
      syllable: string | null;
      grapheme: string | null;
      accuracyScore: number | null;
    }>;
    phonemes: Array<{
      expected: string | null;
      detected: string | null;
      accuracyScore: number | null;
      errorType: string | null;
      alternatives: Array<{ phoneme: string | null; score: number | null }>;
    }>;
  }>;
};

export function parseAzurePronunciationSummary(raw: unknown): AzurePronunciationSummary {
  const root = record(raw);
  const best = records(root?.NBest)[0];
  const overall = record(best?.PronunciationAssessment);

  return {
    recognizedText: text(best?.Display) ?? text(root?.DisplayText),
    overallPronunciationScore: number(overall?.PronScore),
    accuracyScore: number(overall?.AccuracyScore),
    fluencyScore: number(overall?.FluencyScore),
    completenessScore: number(overall?.CompletenessScore),
    words: records(best?.Words).map((word) => {
      const assessment = record(word.PronunciationAssessment);
      return {
        word: text(word.Word),
        accuracyScore: number(assessment?.AccuracyScore),
        errorType: text(assessment?.ErrorType),
        syllables: records(word.Syllables).map((syllable) => ({
          syllable: text(syllable.Syllable),
          grapheme: text(syllable.Grapheme),
          accuracyScore: number(record(syllable.PronunciationAssessment)?.AccuracyScore),
        })),
        phonemes: records(word.Phonemes).map((phoneme) => {
          const phonemeAssessment = record(phoneme.PronunciationAssessment);
          const alternatives = records(phonemeAssessment?.NBestPhonemes).map((candidate) => ({
            phoneme: text(candidate.Phoneme),
            score: number(candidate.Score),
          }));
          return {
            expected: text(phoneme.Phoneme),
            detected: alternatives[0]?.phoneme ?? null,
            accuracyScore: number(phonemeAssessment?.AccuracyScore),
            errorType: text(phonemeAssessment?.ErrorType),
            alternatives,
          };
        }),
      };
    }),
  };
}

async function main() {
  loadRepositoryEnv();

  const audioPath = process.argv[2] ? path.resolve(process.argv[2]) : "";
  if (!audioPath) throw new Error("Usage: npx tsx scripts/azure-pronunciation-test.ts <audio.wav>");
  if (!existsSync(audioPath) || !statSync(audioPath).isFile()) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  if (path.extname(audioPath).toLowerCase() !== ".wav") {
    throw new Error("Expected a .wav file containing PCM audio.");
  }

  const key = requiredEnv("AZURE_SPEECH_KEY");
  const region = requiredEnv("AZURE_SPEECH_REGION");
  const speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = LANGUAGE;
  speechConfig.outputFormat = speechSdk.OutputFormat.Detailed;

  const audioConfig = speechSdk.AudioConfig.fromWavFileInput(
    readFileSync(audioPath),
    path.basename(audioPath),
  );
  const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
  const pronunciationConfig = speechSdk.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
    referenceText: REFERENCE_TEXT,
    gradingSystem: "HundredMark",
    granularity: "Phoneme",
    enableMiscue: true,
    phonemeAlphabet: "IPA",
    nBestPhonemeCount: 5,
  }));
  pronunciationConfig.applyTo(recognizer);

  try {
    const result = await recognizeOnce(recognizer);
    if (result.reason !== speechSdk.ResultReason.RecognizedSpeech) {
      const cancellation = speechSdk.CancellationDetails.fromResult(result);
      throw new Error(
        `Azure recognition failed (${speechSdk.ResultReason[result.reason]}): ${cancellation.errorDetails || cancellation.reason}`,
      );
    }

    const rawJson = result.properties.getProperty(
      speechSdk.PropertyId.SpeechServiceResponse_JsonResult,
    );
    if (!rawJson) throw new Error("Azure returned no raw pronunciation JSON.");
    const raw: unknown = JSON.parse(rawJson);

    console.log("=== Raw Azure result JSON ===");
    console.log(JSON.stringify(raw, null, 2));
    console.log("\n=== Parsed pronunciation summary ===");
    console.log(JSON.stringify(parseAzurePronunciationSummary(raw), null, 2));
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

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
