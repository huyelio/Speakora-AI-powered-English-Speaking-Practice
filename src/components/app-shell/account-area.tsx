import React from "react";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { getCurrentStreak } from "../../modules/dashboard/repository";
import { getProfile } from "../../modules/profile/repository";
import { HeaderActions } from "./header-actions";

/** Streams inside the shell header; a failed streak read only hides the chip. */
export async function AccountArea() {
  const user = await getRequestUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  const streak = profile
    ? await getCurrentStreak(user.id, profile.timezone).catch(() => null)
    : null;
  return <HeaderActions displayName={profile?.displayName ?? ""} streak={streak} />;
}
