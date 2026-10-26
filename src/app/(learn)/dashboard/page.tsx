import { redirect } from "next/navigation";
import { HomeView } from "../../../components/dashboard/home-view";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { formatLearnerDate } from "../../../modules/dashboard/format-date";
import { chooseNextLesson } from "../../../modules/dashboard/next-lesson";
import { getDashboard } from "../../../modules/dashboard/repository";
import { getLearningResumeSummary } from "../../../modules/vocabulary-learning/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/dashboard");
  const [dashboard, resume] = await Promise.all([
    getDashboard(user.id),
    // The card falls back to a topic recommendation if the resume lookup fails.
    getLearningResumeSummary(user.id).catch(() => null),
  ]);
  const top = dashboard.recommendations[0];
  const lesson = chooseNextLesson({
    resume,
    recommendation: top ? { slug: top.slug, name: top.name, level: top.level } : null,
  });
  const todayLabel = formatLearnerDate(new Date(), { weekday: "long", day: "numeric", month: "long" }, dashboard.profile.timezone);

  return <HomeView dashboard={dashboard} lesson={lesson} todayLabel={todayLabel} />;
}
