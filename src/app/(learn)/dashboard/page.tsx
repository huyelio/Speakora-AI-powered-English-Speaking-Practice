import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyGoalCard } from "../../../components/dashboard/daily-goal-card";
import { RecommendationList } from "../../../components/dashboard/recommendation-list";
import { StreakCard } from "../../../components/dashboard/streak-card";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  CREATED: "Đã tạo",
  IN_PROGRESS: "Đang luyện tập",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Có lỗi",
};

export default async function DashboardPage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/dashboard");
  const dashboard = await getDashboard(user.id);

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <p className="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>Xin chào, {dashboard.profile.displayName}</h1>
        <p>Duy trì thói quen nói với một phiên luyện tập ngắn hôm nay.</p>
      </header>

      <DailyGoalCard completed={dashboard.today.completed} target={dashboard.today.target} />

      <Link className="primary dashboard-primary-action" href="/explore">Luyện ngay →</Link>

      <StreakCard current={dashboard.streak.current} level={dashboard.level} longest={dashboard.streak.longest} totalXp={dashboard.totalXp} />

      <section className="dashboard-section" aria-labelledby="recommendations-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">DÀNH CHO BẠN</p><h2 id="recommendations-heading">Chủ đề gợi ý</h2></div>
          <Link href="/explore">Xem tất cả</Link>
        </div>
        <RecommendationList recommendations={dashboard.recommendations} />
      </section>

      <section className="dashboard-section" aria-labelledby="recent-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p><h2 id="recent-heading">Phiên luyện tập mới nhất</h2></div>
          <Link href="/history">Xem lịch sử</Link>
        </div>
        {dashboard.recentSessions.length ? (
          <div className="recent-list">
            {dashboard.recentSessions.map((session) => (
              <Link href={`/history/${session.id}`} key={session.id}>
                <span><strong>{session.topic?.name ?? `${session.mode} Speaking`}</strong><small>{new Date(session.createdAt).toLocaleDateString("vi-VN", { dateStyle: "medium" })}</small></span>
                <span className={`status-badge status-${session.status.toLowerCase()}`}>{statusLabels[session.status] ?? session.status}</span>
              </Link>
            ))}
          </div>
        ) : <p className="empty-state">Chưa có hoạt động. Phiên Speaking đầu tiên sẽ xuất hiện tại đây.</p>}
      </section>

      <section className="mode-entry-grid" aria-labelledby="modes-heading">
        <h2 className="visually-hidden" id="modes-heading">Chế độ luyện tập</h2>
        <Link className="mode-entry-card general" href="/explore"><span>Giao tiếp hằng ngày</span><strong>General English</strong><small>Chọn chủ đề và luyện với 5 câu hỏi có sẵn.</small></Link>
        <Link className="mode-entry-card vocabulary" href="/vocabulary"><span>Flashcard nhanh</span><strong>Vocabulary Practice</strong><small>Ôn từ theo chủ đề: đoán nghĩa rồi tự đánh giá.</small></Link>
        <Link className="mode-entry-card ielts" href="/demo/speech"><span>Luyện thi</span><strong>IELTS Speaking</strong><small>Luyện trọn bộ quy trình IELTS Speaking.</small></Link>
        <article aria-disabled="true" className="mode-entry-card disabled"><span>Sắp ra mắt</span><strong>TOEIC Speaking</strong><small>Chế độ này chưa khả dụng.</small><button disabled type="button">Sắp ra mắt</button></article>
      </section>
    </div>
  );
}

