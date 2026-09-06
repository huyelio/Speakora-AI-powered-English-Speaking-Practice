import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DailyGoalCard } from "./daily-goal-card";
import { RecommendationList } from "./recommendation-list";
import { StreakCard } from "./streak-card";

describe("dashboard cards", () => {
  it("renders bounded goal progress and streak statistics", () => {
    const markup = renderToStaticMarkup(<>
      <DailyGoalCard completed={7} target={5} />
      <StreakCard current={3} longest={8} level={2} totalXp={275} />
    </>);

    expect(markup).toContain('aria-valuemax="5"');
    expect(markup).toContain('aria-valuenow="5"');
    expect(markup).toContain("7/5 câu");
    expect(markup).toContain("275 XP");
  });

  it("links recommendations only to available topic routes", () => {
    const markup = renderToStaticMarkup(<RecommendationList recommendations={[{
      slug: "travel",
      name: "Travel",
      level: "INTERMEDIATE",
      reason: "WEAKNESS_MATCH",
      availableCount: 12,
    }]} />);

    expect(markup).toContain('href="/topics/travel"');
    expect(markup).toContain("Luyện thêm nội dung cần cải thiện gần đây");
  });
});

