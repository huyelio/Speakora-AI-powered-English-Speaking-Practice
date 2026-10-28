import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decodeHistoryCursor, mergeActivityHistory, toConversationHistoryItem } from "./repository";
import type { HistoryItem } from "./types";

const practice = (id: string, createdAt: string): HistoryItem => ({
  id, mode: "GENERAL", status: "COMPLETED", createdAt, completedAt: null, difficulty: null, topic: null, answerCount: 5, summary: null, estimatedBand: null,
});
const roleplay = (id: string, createdAt: string, turns = 4, goals: string[] = ["a", "b"]) => toConversationHistoryItem({
  id, status: "COMPLETED", created_at: createdAt, user_turn_count: turns, completed_goals: goals,
  title: "An airplane chat", goals: [{ id: "a" }, { id: "b" }], summary: "Tốt lắm.",
});

it("maps a role-play row with goals, stars and the saved feedback", () => {
  expect(roleplay("c0000000-0000-4000-8000-000000000001", "2026-10-28T10:00:00.000Z", 4, ["a"])).toEqual({
    kind: "CONVERSATION", id: "c0000000-0000-4000-8000-000000000001", status: "COMPLETED", createdAt: "2026-10-28T10:00:00.000Z",
    title: "An airplane chat", turnCount: 4, goalsCompleted: 1, goalsTotal: 2, stars: 2, summary: "Tốt lắm.",
  });
  expect(roleplay("c0000000-0000-4000-8000-000000000002", "2026-10-28T10:00:00.000Z", 2).stars).toBe(0);
});

it("interleaves both kinds newest first and pages with one cursor", () => {
  const page = mergeActivityHistory(
    [practice("a0000000-0000-4000-8000-000000000001", "2026-10-28T09:00:00.000Z"), practice("a0000000-0000-4000-8000-000000000002", "2026-10-26T09:00:00.000Z")],
    [roleplay("c0000000-0000-4000-8000-000000000003", "2026-10-28T11:00:00.000Z"), roleplay("c0000000-0000-4000-8000-000000000004", "2026-10-27T09:00:00.000Z")],
    3,
  );
  expect(page.items.map((item) => item.kind)).toEqual(["CONVERSATION", "PRACTICE", "CONVERSATION"]);
  expect(decodeHistoryCursor(page.nextCursor!)).toEqual({ createdAt: "2026-10-27T09:00:00.000Z", id: "c0000000-0000-4000-8000-000000000004" });
  expect(mergeActivityHistory([], [], 3)).toEqual({ items: [], nextCursor: null });
});
