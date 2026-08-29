import { describe, expect, it } from "vitest";
import { rankTopicRecommendations } from "./rank";

describe("rankTopicRecommendations", () => {
  it("prefers an unpracticed level match over the most recent topic", () => {
    const results = rankTopicRecommendations(
      { level: "INTERMEDIATE" },
      [
        { slug: "travel", levels: ["INTERMEDIATE"], lastPracticedAt: "2026-08-21T10:00:00Z" },
        { slug: "work", levels: ["INTERMEDIATE"], lastPracticedAt: null },
      ],
      [{ topicSlug: "travel", completedAt: "2026-08-21T10:00:00Z" }],
      [],
    );
    expect(results[0]).toMatchObject({ topicSlug: "work", level: "INTERMEDIATE", reason: "NEW_TOPIC" });
    expect(results.map((item) => item.topicSlug)).not.toContain("travel");
  });

  it("ranks current-level topics before topics at other levels", () => {
    const results = rankTopicRecommendations(
      { level: "BEGINNER" },
      [
        { slug: "advanced-new", levels: ["ADVANCED"], lastPracticedAt: null },
        { slug: "beginner-seen", levels: ["BEGINNER"], lastPracticedAt: "2026-08-20T00:00:00Z" },
      ],
      [],
      [],
    );
    expect(results[0]).toMatchObject({ topicSlug: "beginner-seen", level: "BEGINNER", reason: "LEVEL_MATCH" });
  });

  it("orders unpracticed topics before least-recently practiced topics", () => {
    const results = rankTopicRecommendations(
      { level: "INTERMEDIATE" },
      [
        { slug: "recent", levels: ["INTERMEDIATE"], lastPracticedAt: "2026-08-20T00:00:00Z" },
        { slug: "old", levels: ["INTERMEDIATE"], lastPracticedAt: "2026-08-01T00:00:00Z" },
        { slug: "new", levels: ["INTERMEDIATE"], lastPracticedAt: null },
      ],
      [],
      [],
    );
    expect(results.map((item) => item.topicSlug)).toEqual(["new", "old", "recent"]);
  });

  it("uses recent weakness tags after practice recency", () => {
    const results = rankTopicRecommendations(
      { level: "INTERMEDIATE" },
      [
        { slug: "travel", levels: ["INTERMEDIATE"], lastPracticedAt: null, tags: ["TRAVEL"] },
        { slug: "work", levels: ["INTERMEDIATE"], lastPracticedAt: null, tags: ["WORK", "VOCABULARY"] },
      ],
      [],
      ["VOCABULARY"],
    );
    expect(results[0]).toMatchObject({ topicSlug: "work", reason: "WEAKNESS_MATCH" });
  });

  it("uses a stable slug tie-break and only documented reason codes", () => {
    const results = rankTopicRecommendations(
      { level: "BEGINNER" },
      [
        { slug: "shopping", levels: ["BEGINNER"], lastPracticedAt: null },
        { slug: "family-friends", levels: ["BEGINNER"], lastPracticedAt: null },
      ],
      [],
      [],
    );
    expect(results.map((item) => item.topicSlug)).toEqual(["family-friends", "shopping"]);
    expect(results.every((item) => ["LEVEL_MATCH", "NEW_TOPIC", "WEAKNESS_MATCH", "LEVEL_UP"].includes(item.reason))).toBe(true);
  });
});
