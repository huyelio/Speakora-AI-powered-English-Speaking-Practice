import path from "node:path";
import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";
import { transcodeToAzureWav } from "./audio-to-wav";
import { calculateSpeechMetrics } from "./metrics";
import type { PronunciationAnalysisProvider, PronunciationAnalysisRequest } from "./service";
import type {
  PronunciationAnalysisResult,
  PronunciationPhonemeAnalysis,
  PronunciationSyllableAnalysis,
  PronunciationWordAnalysis,
} from "./types";

const LANGUAGE = "en-US";
const TICKS_PER_MS = 10_000;
type JsonRecord = Record<string, unknown>;

type AzureProviderOptions = {
  key?: string;
  region?: string;
  transcode?: typeof transcodeToAzureWav;
};

export class AzurePronunciationProvider implements PronunciationAnalysisProvider {
  constructor(private readonly options: AzureProviderOptions = {}) {}

  async analyze(input: PronunciationAnalysisRequest) {
    const key = this.options.key?.trim() || process.env.AZURE_SPEECH_KEY?.trim();
    const region = this.options.region?.trim() || process.env.AZURE_SPEECH_REGION?.trim();
    if (!key || !region) throw new Error("Azure Speech is not configured.");
    const wav = await (this.options.transcode ?? transcodeToAzureWav)(input.audio, input.signal);
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = LANGUAGE;
    speechConfig.outputFormat = speechSdk.OutputFormat.Detailed;
    const audioConfig = speechSdk.AudioConfig.fromWavFileInput(wav, `${path.parse(input.fileName).name}.wav`);
    const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
    const config = speechSdk.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
      ...(input.mode === "SCRIPTED" ? { referenceText: input.referenceText } : {}),
      gradingSystem: "HundredMark",
      granularity: "Phoneme",
      enableMiscue: input.mode === "SCRIPTED",
      phonemeAlphabet: "IPA",
      nBestPhonemeCount: 5,
    }));
    if (input.mode === "UNSCRIPTED") config.enableProsodyAssessment = true;
    config.applyTo(recognizer);

    try {
      const segments = input.mode === "SCRIPTED"
        ? [await recognizeOnce(recognizer, input.signal)]
        : await recognizeContinuously(recognizer, input.signal);
      const rawSegments = segments.map(readRawResult);
      const result = mapAzurePronunciationSegments(rawSegments, {
        mode: input.mode,
        referenceText: input.mode === "SCRIPTED" ? input.referenceText : null,
        sourceTranscript: input.mode === "UNSCRIPTED" ? input.transcript : null,
        durationMs: input.mode === "UNSCRIPTED" ? input.durationMs : durationFromSegments(rawSegments),
      });
      return { result, rawResult: { segments: rawSegments } };
    } finally {
      recognizer.close();
      audioConfig.close();
      speechConfig.close();
    }
  }
}

export function mapAzurePronunciationSegments(
  rawSegments: readonly unknown[],
  context: {
    mode: "SCRIPTED" | "UNSCRIPTED";
    referenceText: string | null;
    sourceTranscript: string | null;
    durationMs: number | null;
  },
): PronunciationAnalysisResult {
  const segments = rawSegments.map(record).filter((item): item is JsonRecord => Boolean(item));
  const mappedWords: PronunciationWordAnalysis[] = [];
  const texts: string[] = [];
  const scoreParts: Array<{ duration: number; assessment: JsonRecord }> = [];
  let charOffset = 0;

  for (const segment of segments) {
    const best = records(segment.NBest)[0];
    if (!best) continue;
    const display = text(best.Display) ?? text(segment.DisplayText);
    if (display) texts.push(display);
    const assessment = record(best.PronunciationAssessment);
    if (assessment) scoreParts.push({ duration: finiteNumber(segment.Duration) ?? 0, assessment });
    for (const rawWord of records(best.Words)) {
      const mapped = mapWord(rawWord, charOffset);
      mappedWords.push(mapped);
      charOffset = mapped.charEnd + 1;
    }
  }

  const metrics = calculateSpeechMetrics({
    transcript: context.sourceTranscript ?? texts.join(" "),
    durationMs: context.durationMs,
    words: mappedWords,
  });
  const pronunciation = weightedScore(scoreParts, "PronScore");
  const accuracy = weightedScore(scoreParts, "AccuracyScore") ?? 0;
  const fluency = weightedScore(scoreParts, "FluencyScore");
  const completeness = weightedScore(scoreParts, "CompletenessScore");
  const prosody = weightedScore(scoreParts, "ProsodyScore");
  return {
    schemaVersion: 2,
    assessmentMode: context.mode,
    referenceText: context.referenceText,
    sourceTranscript: context.sourceTranscript,
    scoredText: texts.join(" "),
    languageCode: "en",
    overall: {
      speakingRate: metrics.wpm,
      pronunciation,
      accuracy,
      completeness,
      fluency,
      prosody,
    },
    words: mappedWords,
    metrics,
  };
}

function mapWord(rawWord: JsonRecord, charStart: number): PronunciationWordAnalysis {
  const wordText = text(rawWord.Word) ?? "";
  const assessment = record(rawWord.PronunciationAssessment);
  const errorType = text(assessment?.ErrorType);
  const startMs = ticksToMs(rawWord.Offset);
  const durationMs = ticksToMs(rawWord.Duration);
  const phonemes = records(rawWord.Phonemes).map(mapPhoneme);
  const syllables = records(rawWord.Syllables).map((syllable) => mapSyllable(
    syllable,
    phonemes,
    errorType,
    record(rawWord.PronunciationAssessment),
  ));
  return {
    text: wordText,
    syllables,
    phonemes,
    accuracy: finiteNumber(assessment?.AccuracyScore) ?? 0,
    completeness: finiteNumber(assessment?.CompletenessScore),
    startMs,
    endMs: startMs !== null && durationMs !== null ? startMs + durationMs : null,
    charStart,
    charEnd: charStart + wordText.length,
    errorType,
  };
}

function mapSyllable(
  raw: JsonRecord,
  wordPhonemes: PronunciationPhonemeAnalysis[],
  wordErrorType: string | null,
  wordAssessment: JsonRecord | null,
): PronunciationSyllableAnalysis {
  const startMs = ticksToMs(raw.Offset);
  const durationMs = ticksToMs(raw.Duration);
  const endMs = startMs !== null && durationMs !== null ? startMs + durationMs : null;
  const phonemes = wordPhonemes.filter((phoneme) => {
    if (startMs === null || endMs === null || phoneme.startMs === null || phoneme.endMs === null) return false;
    const midpoint = (phoneme.startMs + phoneme.endMs) / 2;
    return midpoint >= startMs && midpoint <= endMs;
  });
  const syllableAssessment = record(raw.PronunciationAssessment);
  const intonation = record(record(record(wordAssessment?.Feedback)?.Prosody)?.Intonation);
  const monotone = stringArray(intonation?.ErrorTypes).includes("Monotone");
  return {
    text: text(raw.Grapheme) ?? text(raw.Syllable) ?? "",
    expectedIpa: text(raw.Syllable) ?? joinIpa(phonemes, "expectedIpa"),
    detectedIpa: joinIpa(phonemes, "detectedIpa"),
    accuracy: finiteNumber(syllableAssessment?.AccuracyScore) ?? 0,
    completeness: finiteNumber(syllableAssessment?.CompletenessScore),
    pitch: monotone ? "FLAT" : "UNKNOWN",
    durationMs,
    startMs,
    endMs,
    isMissing: wordErrorType === "Omission",
    isExtra: wordErrorType === "Insertion",
    phonemes,
  };
}

function mapPhoneme(raw: JsonRecord): PronunciationPhonemeAnalysis {
  const assessment = record(raw.PronunciationAssessment);
  const startMs = ticksToMs(raw.Offset);
  const durationMs = ticksToMs(raw.Duration);
  const alternatives = records(assessment?.NBestPhonemes).flatMap((candidate) => {
    const ipa = text(candidate.Phoneme);
    const score = finiteNumber(candidate.Score);
    return ipa !== null && score !== null ? [{ ipa, score }] : [];
  });
  return {
    expectedIpa: text(raw.Phoneme),
    detectedIpa: alternatives[0]?.ipa ?? null,
    accuracy: finiteNumber(assessment?.AccuracyScore) ?? 0,
    startMs,
    endMs: startMs !== null && durationMs !== null ? startMs + durationMs : null,
    errorType: text(assessment?.ErrorType),
    alternatives,
  };
}

function joinIpa(
  phonemes: PronunciationPhonemeAnalysis[],
  key: "expectedIpa" | "detectedIpa",
) {
  if (!phonemes.length || phonemes.some((phoneme) => !phoneme[key])) return null;
  return phonemes.map((phoneme) => phoneme[key]).join("");
}

function weightedScore(
  parts: Array<{ duration: number; assessment: JsonRecord }>,
  key: string,
) {
  const present = parts.flatMap(({ duration, assessment }) => {
    const value = finiteNumber(assessment[key]);
    return value === null ? [] : [{ duration: Math.max(1, duration), value }];
  });
  if (!present.length) return null;
  const weight = present.reduce((sum, item) => sum + item.duration, 0);
  return round(present.reduce((sum, item) => sum + item.value * item.duration, 0) / weight, 1);
}

function durationFromSegments(segments: unknown[]) {
  const values = segments.flatMap((segment) => {
    const item = record(segment);
    const offset = finiteNumber(item?.Offset);
    const duration = finiteNumber(item?.Duration);
    return offset !== null && duration !== null ? [offset + duration] : [];
  });
  return values.length ? Math.max(...values) / TICKS_PER_MS : null;
}

function readRawResult(result: speechSdk.SpeechRecognitionResult): JsonRecord {
  if (result.reason !== speechSdk.ResultReason.RecognizedSpeech) {
    throw new Error("Azure pronunciation recognition failed.");
  }
  const json = result.properties.getProperty(speechSdk.PropertyId.SpeechServiceResponse_JsonResult);
  if (!json) throw new Error("Azure returned no pronunciation result.");
  const parsed: unknown = JSON.parse(json);
  const resultRecord = record(parsed);
  if (!resultRecord) throw new Error("Azure returned an invalid pronunciation result.");
  return resultRecord;
}

function recognizeOnce(recognizer: speechSdk.SpeechRecognizer, signal?: AbortSignal) {
  return new Promise<speechSdk.SpeechRecognitionResult>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const abort = () => reject(signal?.reason ?? new Error("Azure pronunciation request aborted."));
    signal?.addEventListener("abort", abort, { once: true });
    recognizer.recognizeOnceAsync(
      (result) => { signal?.removeEventListener("abort", abort); resolve(result); },
      (error) => { signal?.removeEventListener("abort", abort); reject(error); },
    );
  });
}

function recognizeContinuously(recognizer: speechSdk.SpeechRecognizer, signal?: AbortSignal) {
  return new Promise<speechSdk.SpeechRecognitionResult[]>((resolve, reject) => {
    const results: speechSdk.SpeechRecognitionResult[] = [];
    let finished = false;
    const settle = (error?: unknown) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", abort);
      recognizer.stopContinuousRecognitionAsync(
        () => error ? reject(error) : resolve(results),
        (stopError) => reject(error ?? stopError),
      );
    };
    const abort = () => settle(signal?.reason ?? new Error("Azure pronunciation request aborted."));
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    recognizer.recognized = (_sender, event) => {
      if (event.result.reason === speechSdk.ResultReason.RecognizedSpeech) results.push(event.result);
    };
    recognizer.canceled = (_sender, event) => {
      const reason = speechSdk.CancellationReason[event.reason];
      const errorCode = speechSdk.CancellationErrorCode[event.errorCode];
      if (isAzureEndOfStreamCancellation(reason, errorCode)) {
        settle(results.length ? undefined : new Error("Azure returned no pronunciation result."));
        return;
      }
      settle(new Error(event.errorDetails || `Azure pronunciation recognition canceled (${reason}/${errorCode}).`));
    };
    recognizer.sessionStopped = () => settle(results.length ? undefined : new Error("Azure returned no pronunciation result."));
    recognizer.startContinuousRecognitionAsync(undefined, reject);
  });
}

export function isAzureEndOfStreamCancellation(reason: string, errorCode: string) {
  return reason === "EndOfStream" && errorCode === "NoError";
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
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

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function ticksToMs(value: unknown) {
  const ticks = finiteNumber(value);
  return ticks === null ? null : ticks / TICKS_PER_MS;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
