import { redirect } from "next/navigation";
import { ProfileForm } from "../../../components/profile/profile-form";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";
import { getProfile } from "../../../modules/profile/repository";
import Link from "next/link";
import { Target, History } from "lucide-react";
import { SkillOverview } from "../../../components/profile/skill-overview";
import { getLatestSkillReview } from "../../../modules/profile/skill-review";
import { getAvailableTopics } from "../../../modules/topics/repository";
import { EnglishSkills } from "../../../components/profile/english-skills";
import { getEnglishSkills, unassessedEnglishSkills } from "../../../modules/profile/english-skills";
import { getT } from "../../../i18n/server";
import { LanguageSetting } from "../../../components/profile/language-setting";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getT();
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/profile");
  const [profile, dashboard, skillResult, topics, englishSkillsResult] = await Promise.all([
    getProfile(user.id), getDashboard(user.id),
    getLatestSkillReview(user.id).then(review => ({ review, unavailable: false })).catch(() => ({ review: null, unavailable: true })),
    getAvailableTopics(user.id).catch(() => []),
    getEnglishSkills(user.id)
      .then(skills => ({ skills, unavailable: false }))
      .catch(() => ({ skills: unassessedEnglishSkills(), unavailable: true })),
  ]);
  if (!profile) redirect("/onboarding");

  return (
    <div className="profile-page">
      <header className="page-heading profile-heading"><div><p className="eyebrow">{t("HỒ SƠ NGƯỜI HỌC")}</p><h1>{t("Hành trình của")} {profile.displayName}</h1></div><Link className="secondary" href="/history"><History size={18} aria-hidden="true" />{t("Lịch sử luyện tập")}</Link></header>
      <section className="profile-stats" aria-label={t("Thống kê học tập")}>
        <div><strong>{dashboard.streak.current} {t("ngày")}</strong><span>{t("Chuỗi hiện tại")}</span></div>
        <div><strong>{dashboard.streak.longest} {t("ngày")}</strong><span>{t("Chuỗi dài nhất")}</span></div>
        <div><strong>{dashboard.totalXp} XP</strong><span>{t("Cấp")} {dashboard.level}</span></div>
      </section>
      <EnglishSkills skills={englishSkillsResult.skills} unavailable={englishSkillsResult.unavailable} timezone={profile.timezone} />
      <SkillOverview review={skillResult.review} unavailable={skillResult.unavailable} timezone={profile.timezone} />
      <div className="profile-detail-grid">
        <section className="learning-goal-card"><span className="skill-icon"><Target size={25} aria-hidden="true" /></span><p className="eyebrow">{t("ĐÍCH ĐẾN CỦA BẠN")}</p><h2>{t("Mục tiêu học tập")}</h2><p className="learning-purpose">{(profile.learningPurposes ?? [profile.learningPurpose]).map(goal => goal === "IELTS" ? t("Luyện thi chứng chỉ · Band mục tiêu IELTS{0}", profile.targetScore ? ` ${profile.targetScore.toFixed(1)}` : "") : t.dynamic(goal)).join(" · ")}</p><div className="goal-daily-target"><strong>{profile.dailyGoalMinutes ?? 10}</strong><span>{t("phút mỗi ngày")}</span></div>{profile.currentLevel && <p className="form-note">{t("Trình độ hiện tại:")} {profile.currentLevel}{profile.levelSource === "QUICK_CHECK" ? t("· Gợi ý từ Quick Speaking Check") : t("· Bạn tự chọn")}</p>}</section>
        <section className="dashboard-card profile-editor"><h2>{t("Thông tin & mục tiêu")}</h2><ProfileForm profile={profile} topics={topics} /></section>
      </div>
      <section className="dashboard-card profile-settings" id="settings"><h2>{t("Cài đặt")}</h2><LanguageSetting /></section>
    </div>
  );
}
