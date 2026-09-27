import type {
  PronunciationOverallAnalysis,
  PronunciationPitch,
  PronunciationSyllableAnalysis,
  PronunciationWordAnalysis,
} from "./types";

export type ParsedPronunciationAnalysis = {
  scoredText: string;
  overall: PronunciationOverallAnalysis;
  words: PronunciationWordAnalysis[];
};

const TOP_LEVEL_KEYS = ["text", "speaking_rate", "accuracy", "completeness", "words"] as const;
const WORD_KEYS = [
  "text",
  "syllables",
  "accuracy",
  "completeness",
  "start_ms",
  "end_ms",
  "char_start",
  "char_end",
] as const;
const SYLLABLE_KEYS = [
  "text",
  "expected_ipa",
  "detected_ipa",
  "accuracy",
  "completeness",
  "pitch",
  "duration_ms",
  "start_ms",
  "end_ms",
  "is_missing",
  "is_extra",
] as const;

function invalid(): never {
  throw new Error("Invalid pronunciation analysis response.");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) invalid();
}

function string(value: unknown): string {
  if (typeof value !== "string") invalid();
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") invalid();
  return value;
}

function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid();
  return value;
}

function score(value: unknown): number {
  const parsed = finiteNumber(value);
  if (parsed < 0 || parsed > 1) invalid();
  return parsed * 100;
}

function nonNegativeNumber(value: unknown): number {
  const parsed = finiteNumber(value);
  if (parsed < 0) invalid();
  return parsed;
}

function nullableTiming(value: unknown): number | null {
  return value === null ? null : nonNegativeNumber(value);
}

function characterOffset(value: unknown): number {
  const parsed = nonNegativeNumber(value);
  if (!Number.isInteger(parsed)) invalid();
  return parsed;
}

function pitch(value: unknown): PronunciationPitch {
  switch (value) {
    case "high": return "HIGH";
    case "low": return "LOW";
    case "flat": return "FLAT";
    case "unknown": return "UNKNOWN";
    default: return invalid();
  }
}

function timingInterval(
  startValue: unknown,
  endValue: unknown,
): { startMs: number | null; endMs: number | null } {
  const startMs = nullableTiming(startValue);
  const endMs = nullableTiming(endValue);
  if (startMs !== null && endMs !== null && endMs < startMs) invalid();
  return { startMs, endMs };
}

function parseSyllable(value: unknown): PronunciationSyllableAnalysis {
  const input = record(value);
  exactKeys(input, SYLLABLE_KEYS);
  const { startMs, endMs } = timingInterval(input.start_ms, input.end_ms);

  return {
    text: string(input.text),
    expectedIpa: string(input.expected_ipa),
    detectedIpa: string(input.detected_ipa),
    accuracy: score(input.accuracy),
    completeness: score(input.completeness),
    pitch: pitch(input.pitch),
    durationMs: nullableTiming(input.duration_ms),
    startMs,
    endMs,
    isMissing: boolean(input.is_missing),
    isExtra: boolean(input.is_extra),
  };
}

function parseWord(value: unknown): PronunciationWordAnalysis {
  const input = record(value);
  exactKeys(input, WORD_KEYS);
  if (!Array.isArray(input.syllables)) invalid();

  const charStart = characterOffset(input.char_start);
  const charEnd = characterOffset(input.char_end);
  if (charEnd < charStart) invalid();
  const { startMs, endMs } = timingInterval(input.start_ms, input.end_ms);

  return {
    text: string(input.text),
    syllables: input.syllables.map(parseSyllable),
    accuracy: score(input.accuracy),
    completeness: score(input.completeness),
    startMs,
    endMs,
    charStart,
    charEnd,
  };
}

export function parsePronunciationAnalysis(value: unknown): ParsedPronunciationAnalysis {
  const input = record(value);
  exactKeys(input, TOP_LEVEL_KEYS);
  if (!Array.isArray(input.words)) invalid();

  return {
    scoredText: string(input.text),
    overall: {
      speakingRate: nonNegativeNumber(input.speaking_rate),
      accuracy: score(input.accuracy),
      completeness: score(input.completeness),
    },
    words: input.words.map(parseWord),
  };
}
