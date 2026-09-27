import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PronunciationSyllableAnalysis } from "../../modules/pronunciation-analysis/types";
import { SyllableWord } from "./syllable-word";
import { ScoreRing } from "./score-ring";

const part = (text: string, accuracy: number): PronunciationSyllableAnalysis => ({ text, accuracy, completeness: 100, expectedIpa: "/test/", detectedIpa: null, pitch: "UNKNOWN", durationMs: null, startMs: null, endMs: null, isMissing: false, isExtra: false });
describe("accessible pronunciation feedback", () => {
  it("renders focusable syllables with score/status labels and original casing", () => {
    const html = renderToStaticMarkup(<SyllableWord word="Banana" syllables={[part("ba", 85), part("na", 70), part("na", 69)]} />);
    expect(html).toContain('aria-label="Âm tiết ba: 85/100, Tốt"');
    expect(html).toContain('aria-label="Âm tiết na: 70/100, Cần luyện thêm"');
    expect(html).toContain('aria-label="Âm tiết na: 69/100, Cần cải thiện"');
    expect(html).toContain('>Ba</button>');
    expect(html).toContain('type="button"');
  });
  it("preserves the word heading and separates nonmatching segment text", () => {
    const html = renderToStaticMarkup(<SyllableWord word="banana" syllables={[part("bə", 80)]} />);
    expect(html).toContain('lang="en">banana</h1>');
    expect(html).toContain("Các âm tiết được nhận diện");
  });
  it("exposes the score as text independent of the conic gradient", () => {
    expect(renderToStaticMarkup(<ScoreRing score={85} />)).toContain('aria-label="Điểm phát âm: 85 trên 100"');
  });
});
