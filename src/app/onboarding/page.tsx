import { redirect } from "next/navigation";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { getProfile } from "../../modules/profile/repository";
import { OnboardingForm } from "./onboarding-form";
import { getAvailableTopics } from "../../modules/topics/repository";
import { authorizeSession, getClientPracticeSession } from "../../modules/practice/repository";
import type { ClientPracticeSession } from "../../modules/practice/types";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ check?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/onboarding");

  const profile = await getProfile(user.id);
  if (profile?.onboardingCompletedAt) redirect("/dashboard");

  const topicResult = await getAvailableTopics(user.id).then(topics => ({ topics, unavailable: false })).catch(() => ({ topics: [], unavailable: true }));
  const { check } = await searchParams;
  let initialCheck: ClientPracticeSession | null = null;
  if (check && /^[0-9a-f-]{36}$/i.test(check)) {
    const session = await authorizeSession(check, { kind: "user", userId: user.id });
    if (session?.sessionKind === "QUICK_CHECK") initialCheck = await getClientPracticeSession(session);
  }

  return (
    <main className="onboarding-page">
      <OnboardingForm profile={profile} topics={topicResult.topics} topicsUnavailable={topicResult.unavailable} initialCheck={initialCheck} />
    </main>
  );
}
