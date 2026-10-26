import Link from "next/link";
import React from "react";
import { formatLearnerDate } from "../../modules/dashboard/format-date";
import type { NextLesson } from "../../modules/dashboard/next-lesson";
import type { DashboardDto } from "../../modules/dashboard/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { NextLessonCard } from "./next-lesson-card";
import { PracticeTickets } from "./practice-tickets";
import { ProgressTiles } from "./progress-tiles";
import { RecommendationList } from "./recommendation-list";

const statusLabels: Record<string, string> = {
  CREATED: "Đã tạo",
  IN_PROGRESS: "Đang luyện tập",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Có lỗi",
};

export type HomeViewProps = { dashboard: DashboardDto; lesson: NextLesson; todayLabel: string };

export function HomeView({ dashboard, lesson, todayLabel }: HomeViewProps) {
  return (
    <div className="a5-home">
      <header className="a5-hello">
        <h1>Chào {dashboard.profile.displayName}, <em>hôm nay mình học gì?</em></h1>
        <p>{todayLabel}</p>
      </header>

      <NextLessonCard lesson={lesson} />

      <ProgressTiles
        completed={dashboard.today.completed}
        level={dashboard.level}
        streakCurrent={dashboard.streak.current}
        streakLongest={dashboard.streak.longest}
        target={dashboard.today.target}
        totalXp={dashboard.totalXp}
      />

      <section className="a5-section" aria-labelledby="practice-more-heading">
        <div className="a5-section-head"><h2 id="practice-more-heading">Luyện thêm</h2><span>Chọn một vé bất kỳ</span></div>
        <PracticeTickets />
      </section>

      <div className="a5-home-columns">
        <section className="a5-section" aria-labelledby="recommendations-heading">
          <div className="a5-section-head"><h2 id="recommendations-heading">Chủ đề gợi ý</h2><Link href="/explore">Xem tất cả</Link></div>
          <RecommendationList recommendations={dashboard.recommendations} />
        </section>

        <section className="a5-section" aria-labelledby="recent-heading">
          {/* Only speaking sessions write history today; rename to "Hoạt động gần đây" once every mode does. */}
          <div className="a5-section-head"><h2 id="recent-heading">Phiên luyện nói gần đây</h2><Link href="/history">Xem lịch sử</Link></div>
          {dashboard.recentSessions.length ? (
            <div className="recent-list a5-recent">
              {dashboard.recentSessions.map((session) => (
                <Link href={`/history/${session.id}`} key={session.id}>
                  <span>
                    <strong>{session.topic ? topicDisplayName(session.topic.slug, session.topic.name) : session.mode === "IELTS" ? "Luyện thi IELTS" : "Luyện nói"}</strong>
                    <small>{formatLearnerDate(session.createdAt, { dateStyle: "medium" }, dashboard.profile.timezone)}</small>
                  </span>
                  <span className={`status-badge status-${session.status.toLowerCase()}`}>{statusLabels[session.status] ?? session.status}</span>
                </Link>
              ))}
            </div>
          ) : <p className="empty-state">Chưa có phiên luyện nói nào. Phiên đầu tiên sẽ xuất hiện tại đây.</p>}
        </section>
      </div>
    </div>
  );
}
