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
  expect(html).toContain("result-word-chip");
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
    },
    ...shared,
  });

  expect(html).toContain("result-pronunciation-card is-unavailable");
  expect(html).toContain("Hãy hoàn thành một phiên mới");
});
