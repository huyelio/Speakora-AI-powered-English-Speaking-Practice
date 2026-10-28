import { expect, it } from "vitest";
import { mapLeaderboard, weekBounds, type LeaderboardRpcRow } from "./board";

const row = (listIndex: number, name: string, xp: number, isViewer = false, position = listIndex): LeaderboardRpcRow => ({
  position, list_index: listIndex, display_name: name, weekly_xp: xp, is_viewer: isViewer, participants: 14,
  week_start: "2026-10-25T17:00:00.000Z", week_end: "2026-11-01T17:00:00.000Z",
});

it("starts weeks on Monday 00:00 Vietnam time", () => {
  // Wednesday 28 Oct 2026, 23:30 in Vietnam.
  expect(weekBounds(new Date("2026-10-28T16:30:00Z"), 0)).toEqual({ weekStart: "2026-10-25T17:00:00.000Z", weekEnd: "2026-11-01T17:00:00.000Z" });
  // Sunday 23:59 in Vietnam still belongs to the same week; Monday 00:00 starts the next.
  expect(weekBounds(new Date("2026-11-01T16:59:00Z"), 0).weekStart).toBe("2026-10-25T17:00:00.000Z");
  expect(weekBounds(new Date("2026-11-01T17:00:00Z"), 0).weekStart).toBe("2026-11-01T17:00:00.000Z");
  expect(weekBounds(new Date("2026-10-28T16:30:00Z"), 1).weekStart).toBe("2026-10-18T17:00:00.000Z");
});

it("finds the viewer and the XP needed to pass the nearest learner ahead, skipping ties", () => {
  const board = mapLeaderboard([row(1, "An", 300), row(2, "Bình", 120), row(3, "Lan", 120, true, 2), row(4, "Minh", 90)], { visible: true, weeksAgo: 0, now: new Date() });
  expect(board.viewer).toMatchObject({ displayName: "Lan", position: 2, xp: 120 });
  expect(board.next).toEqual({ displayName: "An", gap: 181 });
  expect(board.participants).toBe(14);
});

it("has no gap for the leader and falls back to computed bounds for an empty week", () => {
  expect(mapLeaderboard([row(1, "Lan", 50, true)], { visible: true, weeksAgo: 0, now: new Date() }).next).toBeNull();
  const empty = mapLeaderboard([], { visible: false, weeksAgo: 1, now: new Date("2026-10-28T16:30:00Z") });
  expect(empty).toMatchObject({ rows: [], viewer: null, participants: 0, visible: false, weekStart: "2026-10-18T17:00:00.000Z" });
});
