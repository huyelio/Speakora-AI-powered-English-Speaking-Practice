import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  ClientPronunciationSession,
  PronunciationSessionItem,
} from "../../modules/pronunciation-practice/types";
import { PronunciationSession } from "./pronunciation-session";

vi.mock("./pronunciation-card", () => ({
  PronunciationCard: () => <section>Practice prompt</section>,
}));
vi.mock("./pronunciation-summary", () => ({
  PronunciationSummary: () => <section>Session summary</section>,
}));

function item(id: string, completed: boolean): PronunciationSessionItem {
  return {
    sessionItemId: id,
    vocabularyItemId: id,
    sequenceNo: id === "answered" ? 1 : 2,
    snapshot: {
      word: id,
      pronunciationIpa: `/${id}/`,
      meaningVi: id,
      level: "BEGINNER",
    },
    latestSuccessfulAttempt: completed
      ? {
          attemptId: `attempt-${id}`,
          provider: "test",
          score: 90,
          scoreBand: "GOOD",
          completedAt: "2026-10-22T00:00:00Z",
          result: {
            schemaVersion: 1,
            referenceText: id,
            scoredText: id,
            languageCode: "en",
            overall: { accuracy: 90, completeness: 100, speakingRate: null },
            words: [],
          },
        }
      : null,
  };
}

describe("PronunciationSession", () => {
  it("shows completed prompts as progress instead of filling the bar on the last prompt", () => {
    const session: ClientPronunciationSession = {
      sessionId: "session-1",
      sourceSessionId: null,
      topic: { id: "topic-1", slug: "daily-life", name: "Daily life" },
      level: "BEGINNER",
      itemCount: 2,
      status: "IN_PROGRESS",
      items: [item("answered", true), item("pending", false)],
      summary: {
        averageScore: 90,
        completedCount: 1,
        goodCount: 1,
        practiceCount: 0,
        weakCount: 0,
        weakWords: [],
      },
    };

    const html = renderToStaticMarkup(<PronunciationSession initial={session} />);

    expect(html).toContain("Câu 2/2");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-valuemax="2"');
    expect(html).toContain('width:50%');
  });
});
