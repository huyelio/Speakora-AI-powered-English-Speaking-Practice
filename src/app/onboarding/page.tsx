import { redirect } from "next/navigation";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { getProfile } from "../../modules/profile/repository";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/onboarding");

  const profile = await getProfile(user.id);
  if (profile?.onboardingCompletedAt) redirect("/dashboard");

  return (
    <main className="onboarding-page">
      <OnboardingForm />
    </main>
  );
}
