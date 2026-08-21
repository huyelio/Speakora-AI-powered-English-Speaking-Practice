import { redirect } from "next/navigation";
import { getRequestUser } from "../lib/supabase/auth-server";
import { getProfile } from "../modules/profile/repository";

export default async function HomePage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in");

  const profile = await getProfile(user.id);
  redirect(profile?.onboardingCompletedAt ? "/dashboard" : "/onboarding");
}
