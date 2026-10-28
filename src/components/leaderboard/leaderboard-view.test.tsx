import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { mapLeaderboard, type LeaderboardRpcRow } from "../../modules/leaderboard/board";
import { LeaderboardCard, LeaderboardView, weekRange } from "./leaderboard-view";

const row = (listIndex: number, name: string, xp: number, isViewer = false): LeaderboardRpcRow => ({
  position: listIndex, list_index: listIndex, display_name: name, weekly_xp: xp, is_viewer: isViewer, participants: 15,
  week_start: "2026-10-25T17:00:00.000Z", week_end: "2026-11-01T17:00:00.000Z",
});
const now = new Date("2026-10-28T05:00:00Z");
const names = ["An", "Bình", "Chi", "Dũng", "Em", "Giang", "Hà", "Khoa", "Linh", "Mai"];
const rows = [...names.map((name, i) => row(i + 1, name, 500 - i * 20)), row(13, "Nam", 120), row(14, "Lan", 100, true), row(15, "Oanh", 80)];
const action = async () => {};

it("shows the week, a podium, the viewer's rank with the gap and a cut before the viewer's neighbourhood", () => {
  const board = mapLeaderboard(rows, { visible: true, weeksAgo: 0, now });
  const html = renderToStaticMarkup(<LeaderboardView board={board} now={now} onVisibility={action} />);
  expect(weekRange(board)).toBe("26/10 – 1/11");
  expect(html).toContain("làm mới sau 5 ngày");
  expect(html).toContain("a5-podium-1");
  expect(html).toContain("hạng 14");
  expect(html).toContain("21 XP</strong> để vượt Nam");
  expect(html).toContain("a5-board-gap");
  expect(html).toContain("Ẩn tôi khỏi bảng");
});

it("tells a hidden learner they are hidden and hides the home card", () => {
  const board = mapLeaderboard(rows.filter((item) => !item.is_viewer), { visible: false, weeksAgo: 0, now });
  expect(renderToStaticMarkup(<LeaderboardView board={board} now={now} onVisibility={action} />)).toContain("Bạn đang ẩn khỏi bảng xếp hạng.");
  expect(renderToStaticMarkup(<LeaderboardCard board={board} />)).toBe("");
});

it("invites a learner without XP from the home card", () => {
  const board = mapLeaderboard([], { visible: true, weeksAgo: 0, now });
  expect(renderToStaticMarkup(<LeaderboardCard board={board} />)).toContain("Trả lời một câu luyện nói để lên bảng");
});
