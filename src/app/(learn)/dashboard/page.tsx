import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyGoalCard } from "../../../components/dashboard/daily-goal-card";
import { RecommendationList } from "../../../components/dashboard/recommendation-list";
import { StreakCard } from "../../../components/dashboard/streak-card";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/dashboard");
  const dashboard = await getDashboard(user.id);

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <p className="eyebrow">YOUR LEARNING SPACE</p>
        <h1>Hello, {dashboard.profile.displayName}</h1>
        <p>Keep your speaking habit moving with one focused session.</p>
      </header>

      <DailyGoalCard completed={dashboard.today.completed} target={dashboard.today.target} />

      <Link className="primary dashboard-primary-action" href="/explore">Practice now →</Link>

      <StreakCard current={dashboard.streak.current} level={dashboard.level} longest={dashboard.streak.longest} totalXp={dashboard.totalXp} />

      <section className="dashboard-section" aria-labelledby="recommendations-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">CHOSEN FOR YOU</p><h2 id="recommendations-heading">Recommended topics</h2></div>
          <Link href="/explore">View all</Link>
        </div>
        <RecommendationList recommendations={dashboard.recommendations} />
      </section>

      <section className="dashboard-section" aria-labelledby="recent-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">RECENT ACTIVITY</p><h2 id="recent-heading">Your latest sessions</h2></div>
          <Link href="/history">Full history</Link>
        </div>
        {dashboard.recentSessions.length ? (
          <div className="recent-list">
            {dashboard.recentSessions.map((session) => (
              <Link href={`/history/${session.id}`} key={session.id}>
                <span><strong>{session.topic?.name ?? `${session.mode} speaking`}</strong><small>{new Date(session.createdAt).toLocaleDateString("en", { dateStyle: "medium" })}</small></span>
                <span className={`status-badge status-${session.status.toLowerCase()}`}>{session.status.replaceAll("_", " ")}</span>
              </Link>
            ))}
          </div>
        ) : <p className="empty-state">No activity yet. Your first speaking session will appear here.</p>}
      </section>

      <section className="mode-entry-grid" aria-labelledby="modes-heading">
        <h2 className="visually-hidden" id="modes-heading">Practice modes</h2>
        <Link className="mode-entry-card general" href="/explore"><span>Everyday conversations</span><strong>General English</strong><small>Choose a topic and practice five prepared questions.</small></Link>
        <Link className="mode-entry-card ielts" href="/demo/speech"><span>Exam preparation</span><strong>IELTS Speaking</strong><small>Practice the existing complete IELTS speaking flow.</small></Link>
        <article aria-disabled="true" className="mode-entry-card disabled"><span>Coming soon</span><strong>TOEIC Speaking</strong><small>This mode is not available yet.</small><button disabled type="button">Coming soon</button></article>
      </section>
    </div>
  );
}

