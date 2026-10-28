/** Rows exactly as `get_weekly_leaderboard` returns them. */
export type LeaderboardRpcRow = {
  position: number;
  list_index: number;
  display_name: string;
  weekly_xp: number;
  is_viewer: boolean;
  participants: number;
  week_start: string;
  week_end: string;
};

export type LeaderboardRow = { position: number; listIndex: number; displayName: string; xp: number; isViewer: boolean };

export type WeeklyLeaderboard = {
  weeksAgo: 0 | 1;
  weekStart: string;
  weekEnd: string;
  participants: number;
  rows: LeaderboardRow[];
  /** The viewer's own row; null when hidden or without XP this week. */
  viewer: LeaderboardRow | null;
  /** The nearest learner ahead and the XP needed to pass them. */
  next: { displayName: string; gap: number } | null;
  visible: boolean;
};

const VIETNAM_OFFSET_MS = 7 * 3_600_000;
const WEEK_MS = 7 * 86_400_000;

/** Monday 00:00 Vietnam time (UTC+7, no daylight saving), matching the RPC; used when the board is empty. */
export function weekBounds(now: Date, weeksAgo: number) {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - sinceMonday) - VIETNAM_OFFSET_MS - weeksAgo * WEEK_MS;
  return { weekStart: new Date(start).toISOString(), weekEnd: new Date(start + WEEK_MS).toISOString() };
}

export function mapLeaderboard(rpcRows: readonly LeaderboardRpcRow[], options: { visible: boolean; weeksAgo: 0 | 1; now: Date }): WeeklyLeaderboard {
  const rows = rpcRows.map((row) => ({
    position: row.position, listIndex: row.list_index, displayName: row.display_name, xp: row.weekly_xp, isViewer: row.is_viewer,
  }));
  const viewerIndex = rows.findIndex((row) => row.isViewer);
  const viewer = viewerIndex >= 0 ? rows[viewerIndex] : null;
  const ahead = viewer ? rows.slice(0, viewerIndex).reverse().find((row) => row.xp > viewer.xp) : undefined;
  const bounds = rpcRows[0] ? { weekStart: rpcRows[0].week_start, weekEnd: rpcRows[0].week_end } : weekBounds(options.now, options.weeksAgo);
  return {
    weeksAgo: options.weeksAgo,
    ...bounds,
    participants: rpcRows[0]?.participants ?? 0,
    rows,
    viewer,
    next: viewer && ahead ? { displayName: ahead.displayName, gap: ahead.xp - viewer.xp + 1 } : null,
    visible: options.visible,
  };
}
