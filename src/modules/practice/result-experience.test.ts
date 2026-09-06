import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  collectRecentRecommendationTags,
  mapGeneralResultExperience,
} from "./repository";

it("uses only tags recurring in both of the two most recent assessments", () => {
  expect(collectRecentRecommendationTags([
    { raw_output: { recommendation_tags: ["WORK", "VOCABULARY"] } },
    { raw_output: { recommendation_tags: ["TRAVEL", "VOCABULARY"] } },
    { raw_output: { recommendation_tags: ["WORK", "GRAMMAR"] } },
  ])).toEqual(["VOCABULARY"]);
  expect(collectRecentRecommendationTags([
    { raw_output: { recommendation_tags: ["VOCABULARY"] } },
  ])).toEqual([]);
});

it("zeros a stale streak and recommends a topic using assessment-taxonomy tags", () => {
  const experience = mapGeneralResultExperience({
    session: {
      id: "session-1",
      status: "COMPLETED",
      mode: "GENERAL",
      userId: "user-1",
      guestTokenHash: null,
      questionCount: 5,
      topicId: "travel-id",
      difficulty: "INTERMEDIATE",
    },
    now: new Date("2026-08-21T12:00:00Z"),
    profile: { level: "INTERMEDIATE", timezone: "Asia/Ho_Chi_Minh" },
    goal: { daily_answer_target: 5 },
    daily: { completed_answers: 5, goal_achieved_at: "2026-08-21T11:00:00Z" },
    streak: { current_streak: 6, longest_streak: 8, last_goal_achieved_date: "2026-08-18" },
    allXp: [{ amount: 345 }],
    sessionXp: [{ amount: 95 }],
    topics: [
      topic("travel-id", "travel", "Travel", "2026-08-21T10:00:00Z"),
      topic("family-id", "family-friends", "Family and friends", null),
      topic("shopping-id", "shopping", "Shopping", null),
    ],
    recentAssessments: [
      { raw_output: { recommendation_tags: ["FAMILY_AND_FRIENDS", "VOCABULARY"] } },
      { raw_output: { recommendation_tags: ["FAMILY_AND_FRIENDS", "GRAMMAR"] } },
    ],
  });

  expect(experience.streak).toEqual({ current: 0, longest: 8 });
  expect(experience.nextTopic).toMatchObject({
    slug: "family-friends",
    reason: "WEAKNESS_MATCH",
  });
});

function topic(id: string, slug: string, name: string, lastPracticedAt: string | null) {
  return {
    id,
    slug,
    name,
    levels: [{ level: "INTERMEDIATE" as const, count: 5 }],
    practicedCount: lastPracticedAt ? 1 : 0,
    lastPracticedAt,
  };
}
