import { describe, expect, it } from "vitest";
import { calculateSpeechMetrics } from "./metrics";

describe("calculateSpeechMetrics", () => {
  it("calculates WPM, internal pauses, conservative fillers, and adjacent repetitions", () => {
    const result = calculateSpeechMetrics({
      transcript: "Um I think I think we should go, you know.",
      durationMs: 10_000,
      words: [
        { text: "um", startMs: 0, endMs: 200 },
        { text: "I", startMs: 300, endMs: 500 },
        { text: "think", startMs: 600, endMs: 900 },
        { text: "I", startMs: 1_800, endMs: 2_000 },
        { text: "think", startMs: 2_100, endMs: 2_400 },
        { text: "we", startMs: 2_500, endMs: 2_700 },
        { text: "should", startMs: 2_800, endMs: 3_100 },
        { text: "go", startMs: 3_200, endMs: 3_400 },
        { text: "you", startMs: 3_500, endMs: 3_700 },
        { text: "know", startMs: 3_800, endMs: 4_000 },
      ],
    });

    expect(result).toEqual({
      durationMs: 10_000,
      wordCount: 10,
      wpm: 60,
      longPauseCount: 1,
      longPausesMs: [900],
      fillerCount: 2,
      repetitionCount: 1,
      examples: ["um", "you know", "i think i think"],
    });
  });

  it("does not count leading or trailing silence as a pause", () => {
    expect(calculateSpeechMetrics({
      transcript: "Hello world",
      durationMs: 5_000,
      words: [
        { text: "hello", startMs: 1_000, endMs: 1_500 },
        { text: "world", startMs: 2_000, endMs: 2_500 },
      ],
    }).longPauseCount).toBe(0);
  });
});
