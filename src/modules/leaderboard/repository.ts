import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { mapLeaderboard, type LeaderboardRpcRow, type WeeklyLeaderboard } from "./board";

export async function getWeeklyLeaderboard(userId: string, weeksAgo: 0 | 1 = 0, now = new Date()): Promise<WeeklyLeaderboard> {
  const db = getSupabaseAdminClient();
  const [board, profile] = await Promise.all([
    db.rpc("get_weekly_leaderboard", { p_user_id: userId, p_weeks_ago: weeksAgo }),
    db.from("profiles").select("show_on_leaderboard").eq("user_id", userId).maybeSingle(),
  ]);
  if (board.error || profile.error) throw new Error("Unable to load leaderboard.");
  return mapLeaderboard((board.data ?? []) as LeaderboardRpcRow[], { visible: profile.data?.show_on_leaderboard !== false, weeksAgo, now });
}

/** Only the signed-in learner's own row is changed; callers pass the authenticated user ID. */
export async function setLeaderboardVisibility(userId: string, visible: boolean): Promise<void> {
  const { error } = await getSupabaseAdminClient().from("profiles").update({ show_on_leaderboard: visible }).eq("user_id", userId);
  if (error) throw new Error("Unable to update leaderboard visibility.");
}
