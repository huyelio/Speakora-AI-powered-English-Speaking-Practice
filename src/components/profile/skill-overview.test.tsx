import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SkillOverview } from "./skill-overview";

it("shows actual qualitative feedback, practice words, and the matching saved result", () => {
  const html = renderToStaticMarkup(<SkillOverview timezone="Asia/Ho_Chi_Minh" review={{
    sessionId: "owned-session", completedAt: "2026-10-02T18:00:00Z",
    result: {
      mode: "GENERAL", overallFeedback: "Clear ideas", strengths: [], improvements: [], nextSteps: [],
      usefulPhrase: "I enjoy learning", recommendationTags: [],
      criteria: {
        lexicalResource: { summary: "Try more precise words", example: null },
        grammaticalRangeAccuracy: { summary: "Check past tense", example: null },
        fluencyCoherence: { summary: "Connect your ideas", example: null },
      },
      pronunciation: { available: true, summary: "Some words need practice", practiceWords: ["world"], status: "ATTENTION", analyzedAnswerCount: 1, totalAnswerCount: 5, wordDetails: [] },
    },
  }} />);
  for (const text of ["Try more precise words", "Check past tense", "Connect your ideas", "Some words need practice", "world", "3/10/2026"]) expect(html).toContain(text);
  expect(html).toContain('href="/history/owned-session"');
  expect(html).toContain('href="/pronunciation"');
  expect(html).not.toContain("%");
});

it("distinguishes an empty learner history from a failed read", () => {
  const empty = renderToStaticMarkup(<SkillOverview review={null} />);
  const failed = renderToStaticMarkup(<SkillOverview review={null} unavailable />);
  expect(empty).toContain("Hoàn thành một phiên giao tiếp");
  expect(failed).toContain("Chưa tải được nhận xét");
  expect(failed).not.toContain("Hoàn thành một phiên giao tiếp");
  expect(empty).not.toContain('/history/');
});
