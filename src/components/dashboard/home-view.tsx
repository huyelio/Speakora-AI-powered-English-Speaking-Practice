"use client";

import Link from "next/link";
import React from "react";
import { formatLearnerDate } from "../../modules/dashboard/format-date";
import type { NextLesson } from "../../modules/dashboard/next-lesson";
import type { DashboardDto } from "../../modules/dashboard/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import type { WeeklyLeaderboard } from "../../modules/leaderboard/board";
import { LeaderboardCard } from "../leaderboard/leaderboard-view";
import { NextLessonCard } from "./next-lesson-card";
import { PracticeTickets } from "./practice-tickets";
import { ProgressTiles } from "./progress-tiles";
import { RecommendationList } from "./recommendation-list";
import { useLocale, useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";

const statusLabels: Record<string, string> = {
  CREATED: msg("Đã tạo"),
  IN_PROGRESS: msg("Đang luyện tập"),
  PROCESSING: msg("Đang xử lý"),
  COMPLETED: msg("Hoàn thành"),
  FAILED: msg("Có lỗi"),
};

export type HomeViewProps = { dashboard: DashboardDto; lesson: NextLesson; todayLabel: string; board?: WeeklyLeaderboard | null };

export function HomeView({ dashboard, lesson, todayLabel, board }: HomeViewProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="a5-home">
      <header className="a5-hello">
        <h1>{t("Chào")} {dashboard.profile.displayName}, <em>{t("hôm nay mình học gì?")}</em></h1>
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

      {board ? <LeaderboardCard board={board} /> : null}

      <section className="a5-section" aria-labelledby="practice-more-heading">
        <div className="a5-section-head"><h2 id="practice-more-heading">{t("Luyện thêm")}</h2><span>{t("Chọn một vé bất kỳ")}</span></div>
        <PracticeTickets />
      </section>

      <div className="a5-home-columns">
        <section className="a5-section" aria-labelledby="recommendations-heading">
          <div className="a5-section-head"><h2 id="recommendations-heading">{t("Chủ đề gợi ý")}</h2><Link href="/speaking?tab=topics">{t("Xem tất cả")}</Link></div>
          <RecommendationList recommendations={dashboard.recommendations} />
        </section>

        <section className="a5-section" aria-labelledby="recent-heading">
          {/* Only speaking sessions write history today; rename to "Hoạt động gần đây" once every mode does. */}
          <div className="a5-section-head"><h2 id="recent-heading">{t("Phiên luyện nói gần đây")}</h2><Link href="/history">{t("Xem lịch sử")}</Link></div>
          {dashboard.recentSessions.length ? (
            <div className="recent-list a5-recent">
              {dashboard.recentSessions.map((session) => (
                <Link href={`/history/${session.id}`} key={session.id}>
                  <span>
                    <strong>{session.topic ? t.dynamic(topicDisplayName(session.topic.slug, session.topic.name)) : session.mode === "IELTS" ? t("Luyện thi IELTS") : t("Luyện nói")}</strong>
                    <small>{formatLearnerDate(session.createdAt, { dateStyle: "medium" }, dashboard.profile.timezone, locale)}</small>
                  </span>
                  <span className={`status-badge status-${session.status.toLowerCase()}`}>{t.dynamic(statusLabels[session.status]) ?? session.status}</span>
                </Link>
              ))}
            </div>
          ) : <p className="empty-state">{t("Chưa có phiên luyện nói nào. Phiên đầu tiên sẽ xuất hiện tại đây.")}</p>}
        </section>
      </div>
    </div>
  );
}
