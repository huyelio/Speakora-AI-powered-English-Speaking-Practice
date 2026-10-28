"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { setLeaderboardVisibility } from "./repository";

/** Shows or hides the signed-in learner on the weekly leaderboard. */
export async function updateLeaderboardVisibility(formData: FormData): Promise<void> {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/leaderboard");
  await setLeaderboardVisibility(user.id, formData.get("visible") === "true");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
}
