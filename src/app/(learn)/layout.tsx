import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AppShell } from "../../components/app-shell/app-shell";
import { DefaultLearnSkeleton } from "../../components/loading/learn-skeletons";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { getProfile } from "../../modules/profile/repository";

async function RequireLearner({ children }: { children: ReactNode }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in");

  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");

  return children;
}

/**
 * Sync shell first; auth + page data stream inside Suspense.
 * getRequestUser/getProfile are React.cache()'d so the page reuses the same request work.
 */
export default function LearnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<DefaultLearnSkeleton />}>
        <RequireLearner>{children}</RequireLearner>
      </Suspense>
    </AppShell>
  );
}
