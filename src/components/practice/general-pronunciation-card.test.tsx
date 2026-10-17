import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { SpeakingPronunciationFeedback } from "../../modules/practice/types";
import { GeneralPronunciationCard } from "./general-pronunciation-card";

const base: SpeakingPronunciationFeedback = { available: true, summary: "Một số từ cần chú ý", practiceWords: [], status: "ATTENTION", analyzedAnswerCount: 2, totalAnswerCount: 5, wordDetails: [] };
function render(value: SpeakingPronunciationFeedback) { return renderToStaticMarkup(<GeneralPronunciationCard value={value} />); }

it("keeps attention styling when low overall accuracy produces no practice words", () => {
  const html = render(base);
  expect(html).toContain("is-attention");
  expect(html).toContain("Chưa xác định được từ cụ thể cần luyện");
  expect(html).not.toContain("Luyện các từ này");
});

it("shows missing syllable fields honestly and exposes IPA detail through closed disclosure", () => {
  const html = render({ ...base, practiceWords: ["hello"], wordDetails: [{ word: "hello", syllables: [
    { text: "hel", expectedIpa: "/hɛl/", detectedIpa: "həl", status: "ATTENTION", isMissing: false, isExtra: true },
    { text: null, expectedIpa: null, detectedIpa: null, status: "ATTENTION", isMissing: true, isExtra: false },
    { text: "lo", expectedIpa: "ləʊ", detectedIpa: "ləʊ", status: "CLEAR", isMissing: false, isExtra: false },
  ] }] });
  expect(html).toContain('<details class="general-word-card">');
  expect(html).toContain('<div class="general-syllable is-attention">');
  expect(html).not.toContain('open=""');
  expect(html).toContain("Chuẩn:");
  expect(html).toContain("Bạn đọc:");
  expect(html).toContain("hɛl");
  expect(html).toContain("həl");
  expect(html).not.toContain("//hɛl//");
  expect(html).toContain("Chưa có dữ liệu");
  expect(html).toContain("Thiếu âm");
  expect(html).toContain("Thừa âm");
  expect(html).toContain("Rõ ràng");
  expect(html).toContain('aria-expanded="false"');
  const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
  expect(controls).toBeDefined();
  expect(html).toContain(`<section id="${controls}" class="general-self-practice" hidden=""`);
  expect(html).not.toContain("accuracy");
  expect(html).not.toContain("completeness");
  expect(html).not.toContain("Điểm phát âm");
});

it("shows neutral unavailable and words without syllables without inventing IPA", () => {
  const unavailable = render({ ...base, available: false, status: "UNAVAILABLE", analyzedAnswerCount: 0 });
  expect(unavailable).toContain("is-unavailable");
  expect(unavailable).not.toContain("Luyện các từ này");
  const partial = render({ ...base, practiceWords: ["world"], wordDetails: [{ word: "world", syllables: [] }] });
  expect(partial).toContain("Chưa có chi tiết âm tiết");
  expect(partial).not.toContain("Có phản hồi audio cho");
  expect(partial).not.toContain("general-ipa");
});

it("explains word-level attention even when every syllable is clear", () => {
  const html = render({ ...base, practiceWords: ["world"], wordDetails: [{ word: "world", practiceReason: "WORD_ATTENTION", syllables: [
    { text: "world", expectedIpa: "wɜːld", detectedIpa: "wɜːld", status: "CLEAR", isMissing: false, isExtra: false },
  ] }] });
  expect(html).toContain("Cần luyện cách đọc cả từ");
  expect(html).toContain("Rõ ràng");
  expect(html).toContain("Từ 1/1");
  expect(html).toContain("Trước");
  expect(html).toContain("Tiếp");
  expect(html).not.toContain("accuracy");
});

it("shows plain missing/extra sound labels and supports old DTOs", () => {
  const html = render({ ...base, practiceWords: ["hello"], wordDetails: [{ word: "hello", practiceReason: "MISSING_SOUND", syllables: [
    { text: "hel", expectedIpa: null, detectedIpa: null, status: "ATTENTION", isMissing: true, isExtra: true },
  ] }] });
  expect(html).toContain("Chú ý âm còn thiếu");
  expect(html).toContain("Thiếu âm");
  expect(html).toContain("Thừa âm");
  expect(html).not.toContain("Provider ghi nhận");
  expect(render({ ...base, wordDetails: [{ word: "legacy", syllables: [] }] })).toContain("legacy");
});

it("does not show misleading zero over zero coverage when the total is unavailable", () => {
  const html = render({ ...base, available: false, status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 0 });
  expect(html).not.toContain("0/0 câu");
  expect(html).not.toContain("Có phản hồi audio cho");
  expect(html).toContain("Hãy hoàn thành một phiên mới");
});

it("keeps delivery metrics out of the focused pronunciation practice section", () => {
  const html = render({
    ...base,
    clarity: "ATTENTION",
    fluency: "ATTENTION",
    prosody: "CLEAR",
    wpm: 118,
    longPauseCount: 2,
    fillerCount: 1,
    repetitionCount: 1,
    examples: ["um", "i think i think"],
  });
  expect(html).not.toContain("118 từ/phút");
  expect(html).not.toContain("2 khoảng nghỉ dài");
  expect(html).not.toContain("1 từ/cụm từ đệm");
  expect(html).not.toContain("i think i think");
  expect(html).not.toContain("Điểm Azure");
});

it("shows at most three weak words as closed learner-facing practice disclosures", () => {
  const words = ["comfortable", "world", "thought", "fourth"].map((word) => ({
    word,
    practiceReason: "SYLLABLE_ATTENTION" as const,
    syllables: [{
      text: word,
      expectedIpa: "/expected/",
      detectedIpa: "/detected/",
      status: "ATTENTION" as const,
      isMissing: false,
      isExtra: false,
    }],
  }));
  const html = render({ ...base, practiceWords: words.map((item) => item.word), wordDetails: words });

  expect(html).toContain("3 từ nên luyện lại");
  expect(html.match(/class="general-word-card/g)).toHaveLength(3);
  expect(html.match(/Luyện lại/g)?.length).toBeGreaterThanOrEqual(3);
  expect(html).toContain("comfortable");
  expect(html).toContain("thought");
  expect(html).not.toContain("fourth");
  expect(html).not.toContain('open=""');
  expect(html).toContain("/expected/");
  expect(html).toContain("/detected/");
});
