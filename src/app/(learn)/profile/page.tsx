import { redirect } from "next/navigation";
import { ProfileForm } from "../../../components/profile/profile-form";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";
import { getProfile } from "../../../modules/profile/repository";
import Link from "next/link";
import { Target, History } from "lucide-react";
import { SkillOverview } from "../../../components/profile/skill-overview";
import { getLatestSkillReview } from "../../../modules/profile/skill-review";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/profile");
  const [profile, dashboard, skillResult] = await Promise.all([
    getProfile(user.id), getDashboard(user.id),
    getLatestSkillReview(user.id).then(review => ({ review, unavailable: false })).catch(() => ({ review: null, unavailable: true })),
  ]);
  if (!profile) redirect("/onboarding");

  return (
    <div className="profile-page">
      <header className="page-heading profile-heading"><div><p className="eyebrow">HỒ SƠ NGƯỜI HỌC</p><h1>Hành trình của {profile.displayName}</h1><p>Nhìn lại kỹ năng và giữ mục tiêu của bạn trong tầm mắt.</p></div><Link className="secondary" href="/history"><History size={18} aria-hidden="true" />Lịch sử luyện tập</Link></header>
      <section className="profile-stats" aria-label="Thống kê học tập">
        <div><strong>{dashboard.streak.current} ngày</strong><span>Chuỗi hiện tại</span></div>
        <div><strong>{dashboard.streak.longest} ngày</strong><span>Chuỗi dài nhất</span></div>
        <div><strong>{dashboard.totalXp} XP</strong><span>Cấp {dashboard.level}</span></div>
      </section>
      <SkillOverview review={skillResult.review} unavailable={skillResult.unavailable} timezone={profile.timezone} />
      <div className="profile-detail-grid">
        <section className="learning-goal-card"><span className="skill-icon"><Target size={25} aria-hidden="true" /></span><p className="eyebrow">ĐÍCH ĐẾN CỦA BẠN</p><h2>Mục tiêu học tập</h2><p className="learning-purpose">{profile.learningPurpose}</p><div className="goal-daily-target"><strong>{profile.dailyAnswerTarget}</strong><span>câu luyện tập mỗi ngày</span></div><p className="form-note">Bạn có thể ghi điểm mong muốn trong mục tiêu học tập, chẳng hạn IELTS 6.5.</p></section>
        <section className="dashboard-card profile-editor"><h2>Thông tin & mục tiêu</h2><ProfileForm profile={profile} /></section>
      </div>
    </div>
  );
}
