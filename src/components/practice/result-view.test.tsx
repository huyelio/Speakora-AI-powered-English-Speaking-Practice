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

it("renders only the compact CEFR check feedback and recommendation", () => {
  const html = renderToStaticMarkup(<ResultView answers={[]} principalKind="user" onContinue={() => {}} result={{
    mode: "GENERAL", ...shared, usefulPhrase: "Hidden ordinary phrase", recommendationTags: [],
    pronunciation: { available: false, summary: "Hidden pronunciation", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 3, wordDetails: [] },
    quickCheck: { estimatedCefr: "B1", feedback: "Bạn diễn đạt ý rõ ràng.", recommendation: "Luyện thêm cách giải thích quan điểm." },
  }} />);
  expect(html).toContain("CEFR ước tính");
  expect(html).toContain("B1");
  expect(html).toContain("Bạn diễn đạt ý rõ ràng.");
  expect(html).toContain("Luyện thêm cách giải thích quan điểm.");
  expect(html).toContain("Bắt đầu học");
  expect(html).not.toContain("Hidden pronunciation");
  expect(html).not.toContain("Hidden ordinary phrase");
  expect(html).not.toContain("XP");
});

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
  expect(html).toContain("2 từ nên luyện lại");
  expect(html).toContain("world");
  expect(html).toContain("comfortable");
  expect(html).toContain("result-pronunciation-card is-attention");
  expect(html).toContain("Luyện lại các từ");
  expect(html).not.toContain("Có phản hồi audio cho 3/5 câu");
  expect(html).toContain("wɜːld");
  expect(html).toContain('aria-expanded="false"');
  expect(html.indexOf(shared.overallFeedback)).toBeLessThan(html.indexOf("result-pronunciation-card"));
  expect(html.match(new RegExp(shared.overallFeedback, "g"))).toHaveLength(1);
  expect(html).not.toContain('class="general-overall is-clamped"');
  expect(html.indexOf("general-language")).toBeLessThan(html.indexOf("Gợi ý cho lần sau"));
  expect(html).not.toContain("metric-grid");
  expect(html.indexOf("result-pronunciation-card")).toBeLessThan(
    html.indexOf("general-language"),
  );
  expect(html).not.toContain("không phân tích trực tiếp tín hiệu âm thanh");
  expect(html).not.toContain("Band");
  expect(html).not.toContain("Điểm phát âm");
});

it("organizes General feedback around a learner summary, one priority, and clear next actions", () => {
  const html = render({
    mode: "GENERAL",
    ...shared,
    usefulPhrase: "A useful phrase",
    recommendationTags: [],
    criteria: {
      ...shared.criteria,
      lexicalResource: {
        summary: "Bạn dùng từ phù hợp nhưng có thể chọn từ cụ thể hơn.",
        example: { original: "good", corrected: "enjoyable" },
      },
    },
    pronunciation: {
      available: true,
      summary: "Một vài từ cần chú ý",
      practiceWords: ["comfortable"],
      status: "ATTENTION",
      analyzedAnswerCount: 5,
      totalAnswerCount: 5,
      wordDetails: [{ word: "comfortable", syllables: [] }],
      clarity: "CLEAR",
      fluency: "ATTENTION",
      prosody: "CLEAR",
      wpm: 91,
      longPauseCount: 4,
      fillerCount: 1,
      repetitionCount: 0,
      examples: ["um"],
    },
  });

  expect(html).toContain("Bạn nói khá rõ, nhưng còn hơi ngập ngừng.");
  expect(html).toContain("Phát âm");
  expect(html).toContain("Độ trôi chảy");
  expect(html).toContain("Nhịp nói");
  expect(html.match(/Ưu tiên lần tới/g)).toHaveLength(1);
  expect(html).toContain("Hạn chế dừng quá lâu giữa các ý");
  expect(html).toContain("Cách bạn thể hiện");
  expect(html).toContain("4 khoảng dừng dài");
  expect(html).toContain("Phản hồi ngôn ngữ");
  expect(html).toContain("1 điểm cần sửa");
  expect(html).toContain("good");
  expect(html).toContain("enjoyable");
  expect(html).toContain("Luyện lại các từ");
  expect(html).toContain("Luyện chủ đề khác");
  expect(html).not.toContain("PHẢN HỒI TỪ AUDIO");
  expect(html).not.toContain("Có phản hồi audio cho");
});

it("keeps long criterion feedback collapsed after its first sentence", () => {
  const html = render({
    mode: "GENERAL",
    ...shared,
    usefulPhrase: "",
    recommendationTags: [],
    criteria: {
      ...shared.criteria,
      grammaticalRangeAccuracy: {
        summary: "Bạn dùng được cấu trúc câu cơ bản. Một số câu dài vẫn cần chia nhỏ để dễ hiểu hơn.",
        example: null,
      },
    },
    pronunciation: { available: false, summary: "Unavailable", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5, wordDetails: [] },
  });

  expect(html).toContain("Bạn dùng được cấu trúc câu cơ bản.");
  expect(html).toContain("Xem nhận xét đầy đủ");
  expect(html).toContain("Một số câu dài vẫn cần chia nhỏ để dễ hiểu hơn.");
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

it("collapses General answers and shows supported criterion corrections without affecting IELTS", () => {
  const answers = [{ sessionQuestionId: "q1", answerId: "a1", sequenceNo: 1, questionType: "GENERAL", promptText: "Describe your day", transcript: "I went home.", audioUrl: "/audio" }];
  const result: PracticeResult = { mode: "GENERAL", ...shared, criteria: { ...shared.criteria, lexicalResource: { summary: "Use precise words", example: { original: "good", corrected: "enjoyable" } } }, usefulPhrase: "I enjoy…", recommendationTags: [], pronunciation: { available: true, summary: "Clear", practiceWords: [], status: "CLEAR", analyzedAnswerCount: 5, totalAnswerCount: 5, wordDetails: [] } };
  const html = renderToStaticMarkup(<ResultView result={result} answers={answers} principalKind="user" />);
  expect(html).toContain('<details class="general-answer"');
  expect(html).toContain('<summary><span>Câu 1</span>');
  expect(html).not.toContain('open=""');
  expect(html).toContain("1 điểm cần sửa");
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

it("keeps one concise ending strength without repeating the priority improvement", () => {
  const html = render({ mode: "GENERAL", ...shared, nextSteps: [], usefulPhrase: "", recommendationTags: [],
    pronunciation: { available: false, summary: "Unavailable", practiceWords: [], wordDetails: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5 },
  });
  expect(html).toContain('class="general-coaching"');
  expect(html).toContain("Điểm mạnh");
  expect(html.match(/Nối ý tự nhiên hơn/g)).toHaveLength(1);
});

it("provides expansion for long summaries and additional coaching without rendering empty groups", () => {
  const overallFeedback = "Một nhận xét dài về buổi luyện nói. ".repeat(8);
  const html = render({ mode: "GENERAL", ...shared, overallFeedback, strengths: [], improvements: ["Chú ý cách nối ý", "Dùng câu nối tự nhiên hơn"], nextSteps: [], usefulPhrase: "", recommendationTags: [], pronunciation: { available: false, summary: "Chưa phân tích", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5, wordDetails: [] } });
  expect(html).toContain('class="general-overall-detail"');
  expect(html).toContain("Xem nhận xét tổng quan");
  expect(html.match(new RegExp(overallFeedback, "g"))).toHaveLength(1);
  expect(html).not.toContain("Xem thêm (1)");
  expect(html).toContain("Dùng câu nối tự nhiên hơn");
  expect(html).not.toContain("Điểm mạnh");
  expect(html).not.toContain("Bước tiếp theo");
  expect(html).not.toContain("Gợi ý cho lần sau");
});
