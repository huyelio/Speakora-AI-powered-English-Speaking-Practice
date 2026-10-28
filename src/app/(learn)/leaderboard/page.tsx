import { redirect } from "next/navigation";
import { LeaderboardView } from "../../../components/leaderboard/leaderboard-view";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { updateLeaderboardVisibility } from "../../../modules/leaderboard/actions";
import { getWeeklyLeaderboard } from "../../../modules/leaderboard/repository";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/leaderboard");
  const weeksAgo = (await searchParams).week === "last" ? 1 : 0;
  const now = new Date();
  const board = await getWeeklyLeaderboard(user.id, weeksAgo, now);
  return <LeaderboardView board={board} now={now} onVisibility={updateLeaderboardVisibility} />;
}
