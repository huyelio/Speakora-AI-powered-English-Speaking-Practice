import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decodeHistoryCursor,
  encodeHistoryCursor,
  mapDashboard,
  mapHistory,
} from "./repository";

describe("mapDashboard", () => {
  it("derives level and displays a missed streak as zero", () => {
    const dto = mapDashboard({
      now: new Date("2026-08-21T12:00:00Z"),
      profile: { displayName: "Lan", level: "INTERMEDIATE", timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 10 },
      todayProgress: { completedAnswers: 5 },
      streak: { currentStreak: 7, longestStreak: 9, lastGoalAchievedDate: "2026-08-19" },
      xpEvents: [{ amount: 250 }], topics: [], recentSessions: [], weaknessTags: [],
    });
    expect(dto).toMatchObject({ today: { completed: 5, target: 10 }, streak: { current: 0, longest: 9 }, totalXp: 250, level: 2 });
  });

  it("removes abandoned sessions with no answers", () => {
    const dto = mapDashboard({
      now: new Date("2026-08-21T12:00:00Z"),
      profile: { displayName: "Lan", level: "BEGINNER", timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 5 }, todayProgress: null, streak: null, xpEvents: [], topics: [], weaknessTags: [],
      recentSessions: [
        { id: "empty", status: "IN_PROGRESS", answerCount: 0 },
        { id: "active", status: "PROCESSING", answerCount: 5 },
      ],
    });
    expect(dto.recentSessions.map((item) => item.id)).toEqual(["active"]);
  });

  it("derives today's date in the profile timezone and ignores progress for another day", () => {
    const input = {
      now: new Date("2026-08-21T18:30:00Z"),
      profile: { displayName: "Lan", level: "BEGINNER" as const, timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 5 },
      streak: null,
      xpEvents: [],
      topics: [],
      recentSessions: [],
      weaknessTags: [],
    };

    expect(mapDashboard({ ...input, todayProgress: { localDate: "2026-08-22", completedAnswers: 3 } }).today)
      .toEqual({ localDate: "2026-08-22", completed: 3, target: 5, achieved: false });
    expect(mapDashboard({ ...input, todayProgress: { localDate: "2026-08-21", completedAnswers: 3 } }).today.completed)
      .toBe(0);
  });

  it("keeps today's snapshotted target after the learner changes their future goal", () => {
    const dto = mapDashboard({
      now: new Date("2026-08-21T12:00:00Z"),
      profile: { displayName: "Lan", level: "BEGINNER", timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 10 },
      todayProgress: {
        localDate: "2026-08-21",
        completedAnswers: 5,
        dailyAnswerTarget: 5,
        goalAchievedAt: "2026-08-21T11:00:00Z",
      },
      streak: null, xpEvents: [], topics: [], recentSessions: [], weaknessTags: [],
    });

    expect(dto.today).toEqual({ localDate: "2026-08-21", completed: 5, target: 5, achieved: true });
  });

  it("returns at most three ranked recommendations with safe topic details", () => {
    const dto = mapDashboard({
      now: new Date("2026-08-21T12:00:00Z"),
      profile: { displayName: "Lan", level: "INTERMEDIATE", timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 5 }, todayProgress: null, streak: null, xpEvents: [], recentSessions: [],
      weaknessTags: ["VOCABULARY"],
      topics: [
        { id: "1", slug: "travel", name: "Travel", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 0, lastPracticedAt: null },
        { id: "2", slug: "work", name: "Work", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 2, lastPracticedAt: "2026-08-19T00:00:00Z" },
        { id: "3", slug: "study", name: "Study", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 0, lastPracticedAt: null },
        { id: "4", slug: "hobbies", name: "Hobbies", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 0, lastPracticedAt: null },
      ],
    });

    expect(dto.recommendations).toHaveLength(3);
    expect(dto.recommendations[0]).toMatchObject({ slug: "travel", name: "Travel", level: "INTERMEDIATE", reason: "WEAKNESS_MATCH" });
  });

  it("does not immediately recommend the learner's most recently completed topic", () => {
    const dto = mapDashboard({
      now: new Date("2026-08-21T12:00:00Z"),
      profile: { displayName: "Lan", level: "INTERMEDIATE", timezone: "Asia/Ho_Chi_Minh" },
      goal: { dailyAnswerTarget: 5 }, todayProgress: null, streak: null, xpEvents: [], weaknessTags: [],
      topics: [
        { id: "1", slug: "travel", name: "Travel", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 1, lastPracticedAt: "2026-08-21T10:00:00Z" },
        { id: "2", slug: "work", name: "Work", levels: [{ level: "INTERMEDIATE", count: 12 }], practicedCount: 0, lastPracticedAt: null },
      ],
      recentSessions: [{
        id: "recent", mode: "GENERAL", status: "COMPLETED", answerCount: 5,
        topic: { slug: "travel", name: "Travel" }, completedAt: "2026-08-21T10:00:00Z",
      }],
    });

    expect(dto.recommendations.map((item) => item.slug)).toEqual(["work"]);
  });
});

describe("history cursors", () => {
  it("round-trips a valid opaque cursor", () => {
    const value = { createdAt: "2026-08-21T10:20:30.000Z", id: "24fbfe37-d670-4e39-909a-0cbfdb2a37fa" };
    expect(decodeHistoryCursor(encodeHistoryCursor(value))).toEqual(value);
  });

  it("preserves a valid PostgreSQL timestamp so microsecond pagination stays lossless", () => {
    const createdAt = "2026-08-21T10:20:30.123456+00:00";
    const cursor = encodeHistoryCursor({
      createdAt,
      id: "24fbfe37-d670-4e39-909a-0cbfdb2a37fa",
    });

    expect(decodeHistoryCursor(cursor)).toEqual({
      createdAt,
      id: "24fbfe37-d670-4e39-909a-0cbfdb2a37fa",
    });
  });

  it.each(["", "not-base64", Buffer.from("{}").toString("base64url"), Buffer.from(JSON.stringify({ createdAt: "yesterday", id: "x" })).toString("base64url")])(
    "rejects malformed cursor %j",
    (cursor) => expect(() => decodeHistoryCursor(cursor)).toThrow("Invalid history cursor."),
  );

  it("rejects timestamp filter syntax before it can enter a PostgREST expression", () => {
    const cursor = Buffer.from(JSON.stringify({
      createdAt: "2026-08-21T07:00:00+07:00,id.eq.24fbfe37-d670-4e39-909a-0cbfdb2a37fa",
      id: "24fbfe37-d670-4e39-909a-0cbfdb2a37fa",
    })).toString("base64url");

    expect(() => decodeHistoryCursor(cursor)).toThrow("Invalid history cursor.");
  });
});

describe("mapHistory", () => {
  it("orders equal timestamps by id descending and creates a cursor only when another page exists", () => {
    const rows = [
      { id: "00000000-0000-4000-8000-000000000002", mode: "GENERAL" as const, status: "COMPLETED", createdAt: "2026-08-21T10:00:00.000Z", answerCount: 5 },
      { id: "00000000-0000-4000-8000-000000000003", mode: "GENERAL" as const, status: "PROCESSING", createdAt: "2026-08-21T10:00:00.000Z", answerCount: 5 },
      { id: "00000000-0000-4000-8000-000000000001", mode: "IELTS" as const, status: "COMPLETED", createdAt: "2026-08-20T10:00:00.000Z", answerCount: 5 },
    ];

    const dto = mapHistory(rows, 2);

    expect(dto.items.map((item) => item.id)).toEqual([
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000002",
    ]);
    expect(decodeHistoryCursor(dto.nextCursor ?? "")).toEqual({
      createdAt: "2026-08-21T10:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000002",
    });
  });
});
