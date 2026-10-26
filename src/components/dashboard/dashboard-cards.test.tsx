import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NextLessonCard } from "./next-lesson-card";
import { PracticeTickets } from "./practice-tickets";
import { ProgressTiles } from "./progress-tiles";
import { RecommendationList } from "./recommendation-list";

describe("dashboard cards", () => {
  it("renders bounded goal progress, streak and level statistics", () => {
    const markup = renderToStaticMarkup(
      <ProgressTiles completed={7} target={5} streakCurrent={3} streakLongest={8} level={2} totalXp={275} />,
    );

    expect(markup).toContain('aria-valuemax="5"');
    expect(markup).toContain('aria-valuenow="5"');
    expect(markup).toContain("7/5");
    expect(markup).toContain("Bạn đã hoàn thành mục tiêu hôm nay.");
    expect(markup).toContain("dài nhất 8 ngày");
    expect(markup).toContain("còn 225 XP nữa để lên cấp 3");
  });

  it("links recommendations only to available topic routes with Vietnamese names", () => {
    const markup = renderToStaticMarkup(<RecommendationList recommendations={[{
      slug: "travel",
      name: "Travel",
      level: "INTERMEDIATE",
      reason: "WEAKNESS_MATCH",
      availableCount: 12,
    }]} />);

    expect(markup).toContain('href="/topics/travel"');
    expect(markup).toContain("Du lịch");
    expect(markup).toContain("Luyện thêm nội dung cần cải thiện gần đây");
  });

  it("resumes the exact unfinished learning session with its step chips", () => {
    const markup = renderToStaticMarkup(<NextLessonCard lesson={{
      kind: "resume",
      href: "/vocabulary-learning/3f1c",
      topicSlug: "travel",
      topicName: "Travel",
      stage: "RECALL",
      stageIndex: 2,
      position: 3,
      total: 6,
    }} />);

    expect(markup).toContain('href="/vocabulary-learning/3f1c"');
    expect(markup).toContain("Bài nên học hôm nay");
    expect(markup).toContain("Học tiếp");
    expect(markup).toMatch(/aria-current="step"[^>]*>Nhớ từ/);
    expect(markup).toContain("3/6");
  });

  it("offers a valid action for a brand-new learner", () => {
    const markup = renderToStaticMarkup(<NextLessonCard lesson={{ kind: "start", href: "/vocabulary?mode=learn" }} />);

    expect(markup).toContain('href="/vocabulary?mode=learn"');
    expect(markup).not.toContain("aria-current");
  });

  it("links every practice ticket", () => {
    const markup = renderToStaticMarkup(<PracticeTickets />);

    expect(markup.match(/class="a5-ticket"/g)).toHaveLength(5);
    expect(markup).toContain('href="/ielts"');
  });
});
