import type { PronunciationSpeechMetrics } from "./types";

const LONG_PAUSE_MS = 800;
const FILLERS = ["you know", "i mean", "um", "uh", "erm", "er"] as const;

export type TimedWord = { text: string; startMs: number | null; endMs: number | null };

export function calculateSpeechMetrics(input: {
  transcript: string;
  durationMs: number | null;
  words: readonly TimedWord[];
}): PronunciationSpeechMetrics {
  const durationMs = input.durationMs !== null && input.durationMs >= 0 ? input.durationMs : null;
  const tokens = tokenize(input.transcript);
  const fillerExamples: string[] = [];
  let fillerCount = 0;
  for (let index = 0; index < tokens.length;) {
    const filler = FILLERS.find((candidate) => {
      const parts = candidate.split(" ");
      return parts.every((part, offset) => tokens[index + offset] === part);
    });
    if (!filler) { index += 1; continue; }
    fillerCount += 1;
    if (!fillerExamples.includes(filler)) fillerExamples.push(filler);
    index += filler.split(" ").length;
  }

  const repetitionExamples: string[] = [];
  let repetitionCount = 0;
  for (let index = 0; index < tokens.length;) {
    let repeatedLength = 0;
    for (let length = 3; length >= 1; length -= 1) {
      if (index + length * 2 > tokens.length) continue;
      const first = tokens.slice(index, index + length).join(" ");
      const second = tokens.slice(index + length, index + length * 2).join(" ");
      if (first === second) { repeatedLength = length; break; }
    }
    if (!repeatedLength) { index += 1; continue; }
    repetitionCount += 1;
    const example = tokens.slice(index, index + repeatedLength * 2).join(" ");
    if (!repetitionExamples.includes(example)) repetitionExamples.push(example);
    index += repeatedLength * 2;
  }

  const longPausesMs: number[] = [];
  for (let index = 1; index < input.words.length; index += 1) {
    const previousEnd = input.words[index - 1].endMs;
    const currentStart = input.words[index].startMs;
    if (previousEnd === null || currentStart === null) continue;
    const gap = currentStart - previousEnd;
    if (gap >= LONG_PAUSE_MS) longPausesMs.push(Math.round(gap));
  }

  return {
    durationMs,
    wordCount: input.words.length,
    wpm: durationMs && durationMs > 0
      ? round(input.words.length * 60_000 / durationMs, 1)
      : null,
    longPauseCount: longPausesMs.length,
    longPausesMs,
    fillerCount,
    repetitionCount,
    examples: [...fillerExamples, ...repetitionExamples].slice(0, 3),
  };
}

function tokenize(value: string) {
  return value.toLocaleLowerCase("en").match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
