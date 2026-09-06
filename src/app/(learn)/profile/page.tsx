import { redirect } from "next/navigation";
import { ProfileForm } from "../../../components/profile/profile-form";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";
import { getProfile } from "../../../modules/profile/repository";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/profile");
  const [profile, dashboard] = await Promise.all([getProfile(user.id), getDashboard(user.id)]);
  if (!profile) redirect("/onboarding");

  return (
    <div className="profile-page">
      <header className="page-heading"><p className="eyebrow">LEARNER PROFILE</p><h1>Your settings</h1><p>Keep your plan aligned with how and why you want to speak English.</p></header>
      <section className="profile-stats" aria-label="Read-only learning statistics">
        <div><strong>{dashboard.streak.current} days</strong><span>Current streak</span></div>
        <div><strong>{dashboard.streak.longest} days</strong><span>Longest streak</span></div>
        <div><strong>{dashboard.totalXp} XP</strong><span>Level {dashboard.level}</span></div>
      </section>
      <section className="dashboard-card profile-editor"><h2>Edit profile</h2><ProfileForm profile={profile} /></section>
    </div>
  );
}
