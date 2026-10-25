import Link from "next/link";
import { ArrowUpRight, AudioLines, BookOpen, GraduationCap, MessagesSquare, Sparkles } from "lucide-react";
import { TopicIcon } from "../../../components/ui/topic-icon";
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
      <header className="page-heading dashboard-hero">
        <div className="dashboard-hero-copy">
        <p className="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>Xin chào, {dashboard.profile.displayName}</h1>
        <p>Một chút luyện tập hôm nay.<br />Tự tin hơn trong mỗi cuộc trò chuyện.</p>
        <Link className="primary" href="/explore">Bắt đầu luyện tập <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <span className="hero-footnote"><Sparkles size={15} aria-hidden="true" />Luyện theo chủ đề · Nhận phản hồi từ AI</span>
        </div>
        <div className="dashboard-topic-art" aria-hidden="true">
          <TopicIcon slug="travel" size={150} />
          <TopicIcon slug="study" size={120} />
          <TopicIcon slug="social-situations" size={112} />
        </div>
      </header>

      <div className="dashboard-progress-grid">
      <DailyGoalCard completed={dashboard.today.completed} target={dashboard.today.target} />
      <StreakCard current={dashboard.streak.current} level={dashboard.level} longest={dashboard.streak.longest} totalXp={dashboard.totalXp} />
      </div>

      <section className="dashboard-section" aria-labelledby="modes-heading">
        <div className="section-heading-row"><div><p className="eyebrow">MỖI NGÀY MỘT BƯỚC TIẾN</p><h2 id="modes-heading">Hôm nay bạn muốn luyện gì?</h2></div></div>
        <div className="mode-entry-grid">
          <Link className="mode-entry-card vocabulary" href="/vocabulary"><span className="mode-icon"><BookOpen size={24} aria-hidden="true" /></span><strong>Từ vựng</strong><small>Ôn từ theo chủ đề với flashcard ngắn gọn.</small><span className="mode-card-action">Mở rộng vốn từ <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
          <Link className="mode-entry-card pronunciation" href="/pronunciation"><span className="mode-icon"><AudioLines size={24} aria-hidden="true" /></span><strong>Phát âm</strong><small>Nghe mẫu, ghi âm và luyện rõ từng từ.</small><span className="mode-card-action">Nói rõ ràng hơn <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
          <Link className="mode-entry-card general" href="/explore"><span className="mode-icon"><MessagesSquare size={24} aria-hidden="true" /></span><strong>Giao tiếp theo chủ đề</strong><small>Luyện nói trong những tình huống quen thuộc.</small><span className="mode-card-action">Tự tin trò chuyện <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
          <Link className="mode-entry-card ielts" href="/demo/speech"><span className="mode-icon"><GraduationCap size={24} aria-hidden="true" /></span><strong>Luyện thi IELTS</strong><small>Thực hành IELTS Speaking và nhận band ước tính.</small><span className="mode-card-action">Sẵn sàng cho kỳ thi <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        </div>
      </section>

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

    </div>
  );
}

