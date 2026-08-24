import { describe, expect, it } from "vitest";
import { mapTopicAvailability } from "./availability";

describe("mapTopicAvailability", () => {
  it("keeps only topic levels with five active General questions and merges learner history", () => {
    const topics = mapTopicAvailability(
      [
        { topicId: "travel", slug: "travel", name: "Travel", level: "BEGINNER", count: 5 },
        { topicId: "travel", slug: "travel", name: "Travel", level: "INTERMEDIATE", count: 5 },
        { topicId: "food", slug: "food", name: "Food", level: "BEGINNER", count: 4 },
      ],
      [
        { topicId: "travel", practicedCount: 3, lastPracticedAt: "2026-08-20T00:00:00Z" },
        { topicId: "food", practicedCount: 9, lastPracticedAt: "2026-08-21T00:00:00Z" },
      ],
    );

    expect(topics).toEqual([
      {
        id: "travel",
        slug: "travel",
        name: "Travel",
        levels: [
          { level: "BEGINNER", count: 5 },
          { level: "INTERMEDIATE", count: 5 },
        ],
        practicedCount: 3,
        lastPracticedAt: "2026-08-20T00:00:00Z",
      },
    ]);
  });

  it("filters case-insensitively after removing unavailable combinations", () => {
    const topics = mapTopicAvailability(
      [
        { topicId: "home", slug: "home-life", name: "Home Life", level: "BEGINNER", count: 5 },
        { topicId: "hobby", slug: "hobbies", name: "Hobbies", level: "BEGINNER", count: 5 },
      ],
      [],
      { search: "HOME", level: "BEGINNER" },
    );

    expect(topics.map((topic) => topic.id)).toEqual(["home"]);
  });
});
