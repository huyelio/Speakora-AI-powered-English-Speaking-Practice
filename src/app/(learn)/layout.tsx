import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "../../components/app-shell/app-shell";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { getProfile } from "../../modules/profile/repository";

export default async function LearnerLayout({ children }: { children: ReactNode }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in");

  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
