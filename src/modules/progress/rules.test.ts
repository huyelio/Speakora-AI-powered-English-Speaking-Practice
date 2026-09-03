import { describe, expect, it } from "vitest";
import { effectiveCurrentStreak, learnerLocalDate, levelFromXp, nextStreak } from "./rules";

describe("learnerLocalDate", () => {
  it("uses the learner timezone across a UTC date boundary", () => {
    expect(learnerLocalDate(new Date("2026-08-21T17:30:00Z"), "Asia/Ho_Chi_Minh"))
      .toBe("2026-08-22");
  });

  it("rejects invalid IANA zones", () => {
    expect(() => learnerLocalDate(new Date(), "GMT+7-ish")).toThrow("Invalid timezone");
  });
});

describe("nextStreak", () => {
  it("starts, increments, and does not double-increment a local date", () => {
    expect(nextStreak({ current: 0, longest: 0, lastAchievedDate: null }, "2026-08-20"))
      .toEqual({ current: 1, longest: 1, lastAchievedDate: "2026-08-20" });
    expect(nextStreak({ current: 1, longest: 1, lastAchievedDate: "2026-08-20" }, "2026-08-21").current)
      .toBe(2);
    expect(nextStreak({ current: 2, longest: 2, lastAchievedDate: "2026-08-21" }, "2026-08-21").current)
      .toBe(2);
  });

  it("restarts after a missed day", () => {
    expect(nextStreak({ current: 8, longest: 8, lastAchievedDate: "2026-08-18" }, "2026-08-21"))
      .toEqual({ current: 1, longest: 8, lastAchievedDate: "2026-08-21" });
  });
});

describe("effectiveCurrentStreak", () => {
  it("displays a stored streak as zero after a learner-local day was missed", () => {
    expect(effectiveCurrentStreak({
      current: 8,
      longest: 8,
      lastAchievedDate: "2026-08-18",
    }, "2026-08-21")).toBe(0);
  });

  it("keeps yesterday's streak active while today's goal can still be reached", () => {
    expect(effectiveCurrentStreak({
      current: 8,
      longest: 8,
      lastAchievedDate: "2026-08-20",
    }, "2026-08-21")).toBe(8);
  });
});

it("derives one level per 250 XP", () => {
  expect([levelFromXp(0), levelFromXp(249), levelFromXp(250), levelFromXp(500)])
    .toEqual([1, 1, 2, 3]);
});
