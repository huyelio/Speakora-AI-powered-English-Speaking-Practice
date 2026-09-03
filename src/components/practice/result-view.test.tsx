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
    <ResultView
      answers={[]}
      principalKind="user"
      result={result}
    />,
  );
}

it("shows the IELTS estimate and transcript-only disclosure", () => {
  const html = render({ mode: "IELTS", estimatedBand: 6.5, ...shared });

  expect(html).toContain("6.5");
  expect(html).toContain("không phải điểm IELTS chính thức");
  expect(html).toContain("Phát âm");
});

it("shows General rewards and useful phrase without band or pronunciation", () => {
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
        ...shared,
      }}
    />,
  );

  expect(html).toContain("One thing I really enjoy is…");
  expect(html).toContain("+95 XP");
  expect(html).toContain("Work");
  expect(html).toContain("Chủ đề mới để mở rộng vốn diễn đạt.");
  expect(html).not.toContain("Band");
  expect(html).not.toContain("Phát âm");
});
