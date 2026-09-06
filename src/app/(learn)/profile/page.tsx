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
      <header className="page-heading"><p className="eyebrow">HỒ SƠ NGƯỜI HỌC</p><h1>Cài đặt của bạn</h1><p>Điều chỉnh kế hoạch theo mục tiêu và cách bạn muốn luyện nói tiếng Anh.</p></header>
      <section className="profile-stats" aria-label="Thống kê học tập">
        <div><strong>{dashboard.streak.current} ngày</strong><span>Chuỗi hiện tại</span></div>
        <div><strong>{dashboard.streak.longest} ngày</strong><span>Chuỗi dài nhất</span></div>
        <div><strong>{dashboard.totalXp} XP</strong><span>Cấp {dashboard.level}</span></div>
      </section>
      <section className="dashboard-card profile-editor"><h2>Chỉnh sửa hồ sơ</h2><ProfileForm profile={profile} /></section>
    </div>
  );
}
