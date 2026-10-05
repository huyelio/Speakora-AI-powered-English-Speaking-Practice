import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { expect, it } from "vitest";
import type { PracticeResult } from "../../modules/practice/types";
import { ResultView } from "./result-view";

const criterion = { summary: "Nhận xét dựa trên transcript.", example: null };
const shared = {
  overallFeedback: "Bạn truyền đạt được ý chính.",
  strengths: ["Ý rõ ràng"],
  improvements: ["Nối ý tự nhiên hơn"],
  nextSteps: ["Luyện câu nối"],
  criteria: {
    fluencyCoherence: criterion,
    lexicalResource: criterion,
    grammaticalRangeAccuracy: criterion,
  },
};

function render(result: PracticeResult) {
  return renderToStaticMarkup(
    <ResultView answers={[]} principalKind="user" result={result} />,
  );
}

it("shows the IELTS estimate and transcript-only disclosure", () => {
  const html = render({ mode: "IELTS", estimatedBand: 6.5, ...shared });

  expect(html).toContain("6.5");
  expect(html).toContain("không phải điểm IELTS chính thức");
  expect(html).toContain("Phát âm");
});

it("shows General rewards and basic pronunciation feedback without a score", () => {
  const html = renderToStaticMarkup(
    <ResultView
      answers={[]}
      experience={{
        rewards: { sessionXp: 95, totalXp: 345, level: 2 },
        dailyGoal: { completed: 5, target: 5, achieved: true },
        streak: { current: 3, longest: 8 },
        nextTopic: { slug: "work", name: "Work", level: "INTERMEDIATE", reason: "NEW_TOPIC" },
      }}
      principalKind="user"
      result={{
        mode: "GENERAL",
        usefulPhrase: "One thing I really enjoy is…",
        recommendationTags: ["TRAVEL"],
        pronunciation: {
          available: true,
          summary: "Một số từ cần chú ý",
          practiceWords: ["world", "comfortable"],
          status: "ATTENTION", analyzedAnswerCount: 3, totalAnswerCount: 5,
          wordDetails: [{ word: "world", syllables: [{ text: "world", expectedIpa: "wɜːld", detectedIpa: "wɜːd", status: "ATTENTION", isMissing: true, isExtra: false }] }, { word: "comfortable", syllables: [] }],
        },
        ...shared,
      }}
    />,
  );

  expect(html).toContain("One thing I really enjoy is…");
  expect(html).toContain("+95 XP");
  expect(html).toContain("Work");
  expect(html).toContain("Một số từ cần chú ý");
  expect(html).toContain("world");
  expect(html).toContain("comfortable");
  expect(html).toContain("result-pronunciation-card is-attention");
  expect(html).toContain("Luyện các từ này");
  expect(html).toContain("Có phản hồi audio cho 3/5 câu");
  expect(html).toContain("wɜːld");
  expect(html).toContain('aria-expanded="false"');
  expect(html.indexOf(shared.overallFeedback)).toBeLessThan(html.indexOf("result-pronunciation-card"));
  expect(html.match(new RegExp(shared.overallFeedback, "g"))).toHaveLength(1);
  expect(html).not.toContain('class="general-overall is-clamped"');
  expect(html.indexOf("criteria-section")).toBeLessThan(html.indexOf("Gợi ý cho lần sau"));
  expect(html).not.toContain("metric-grid");
  expect(html.indexOf("result-pronunciation-card")).toBeLessThan(
    html.indexOf("criteria-section"),
  );
  expect(html).not.toContain("không phân tích trực tiếp tín hiệu âm thanh");
  expect(html).not.toContain("Band");
  expect(html).not.toContain("Điểm phát âm");
});

it("makes unavailable pronunciation feedback visible for an older session", () => {
  const html = render({
    mode: "GENERAL",
    usefulPhrase: "One useful phrase",
    recommendationTags: [],
    pronunciation: {
      available: false,
      summary: "Pronunciation analysis is unavailable for this session",
      practiceWords: [],
      status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5, wordDetails: [],
    },
    ...shared,
  });

  expect(html).toContain("result-pronunciation-card is-unavailable");
  expect(html).toContain("Hãy hoàn thành một phiên mới");
  expect(html).not.toContain("Luyện các từ này");
});

it("collapses General answers and criterion examples without affecting IELTS answers", () => {
  const answers = [{ sessionQuestionId: "q1", answerId: "a1", sequenceNo: 1, questionType: "GENERAL", promptText: "Describe your day", transcript: "I went home.", audioUrl: "/audio" }];
  const result: PracticeResult = { mode: "GENERAL", ...shared, criteria: { ...shared.criteria, lexicalResource: { summary: "Use precise words", example: { original: "good", corrected: "enjoyable" } } }, usefulPhrase: "I enjoy…", recommendationTags: [], pronunciation: { available: true, summary: "Clear", practiceWords: [], status: "CLEAR", analyzedAnswerCount: 5, totalAnswerCount: 5, wordDetails: [] } };
  const html = renderToStaticMarkup(<ResultView result={result} answers={answers} principalKind="user" />);
  expect(html).toContain('<details class="general-answer"');
  expect(html).toContain('<summary><span>Câu 1</span>');
  expect(html).not.toContain('open=""');
  expect(html).toContain("Xem ví dụ");
  expect(html).toContain("I went home.");
  const ielts = renderToStaticMarkup(<ResultView result={{ mode: "IELTS", estimatedBand: 6.5, ...shared }} answers={answers} principalKind="user" />);
  expect(ielts).not.toContain("general-answer");
  expect(ielts).toContain("Transcript gốc");
});

it("does not repeat the summary takeaways in General coaching and handles absent criteria", () => {
  const html = render({ mode: "GENERAL", ...shared, criteria: null,
    strengths: ["First strength", "Another strength"], improvements: ["First improvement", "Another improvement"],
    nextSteps: ["A next step"], usefulPhrase: "", recommendationTags: [],
    pronunciation: { available: false, summary: "Unavailable", practiceWords: [], wordDetails: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5 },
  });
  expect(html.match(/First strength/g)).toHaveLength(1);
  expect(html.match(/First improvement/g)).toHaveLength(1);
  expect(html).toContain("Another strength");
  expect(html).toContain("Another improvement");
  expect(html).toContain("A next step");
  expect(html).toContain("Chưa có nhận xét theo tiêu chí cho phiên này.");
  expect(html).not.toContain("criteria-grid");
});

it("omits empty coaching after moving the only takeaways into the summary", () => {
  const html = render({ mode: "GENERAL", ...shared, nextSteps: [], usefulPhrase: "", recommendationTags: [],
    pronunciation: { available: false, summary: "Unavailable", practiceWords: [], wordDetails: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5 },
  });
  expect(html).not.toContain('class="general-coaching"');
  expect(html).toContain("Bạn làm tốt");
  expect(html).toContain("Ưu tiên cải thiện");
});

it("provides expansion for long summaries and additional coaching without rendering empty groups", () => {
  const overallFeedback = "Một nhận xét dài về buổi luyện nói. ".repeat(8);
  const html = render({ mode: "GENERAL", ...shared, overallFeedback, strengths: [], improvements: ["Chú ý cách nối ý", "Dùng câu nối tự nhiên hơn"], nextSteps: [], usefulPhrase: "", recommendationTags: [], pronunciation: { available: false, summary: "Chưa phân tích", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5, wordDetails: [] } });
  expect(html).toContain('class="general-overall is-clamped"');
  expect(html).toContain('aria-controls="general-overall"');
  expect(html).toContain("Xem đầy đủ");
  expect(html.match(new RegExp(overallFeedback, "g"))).toHaveLength(1);
  expect(html).not.toContain("Xem thêm (1)");
  expect(html).toContain("Dùng câu nối tự nhiên hơn");
  expect(html).not.toContain("Điểm mạnh");
  expect(html).not.toContain("Bước tiếp theo");
  expect(html).not.toContain("Gợi ý cho lần sau");
});
