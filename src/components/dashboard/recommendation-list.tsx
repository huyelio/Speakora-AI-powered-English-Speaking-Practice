"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";
import { TopicIcon } from "../ui/topic-icon";
import type { DashboardRecommendation } from "../../modules/dashboard/types";
import type { LearnerLevel } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: msg("Cơ bản"),
  INTERMEDIATE: msg("Trung cấp"),
  ADVANCED: msg("Nâng cao"),
};

const reasonLabels: Record<DashboardRecommendation["reason"], string> = {
  LEVEL_MATCH: msg("Phù hợp với trình độ hiện tại"),
  NEW_TOPIC: msg("Thử một chủ đề trò chuyện mới"),
  WEAKNESS_MATCH: msg("Luyện thêm nội dung cần cải thiện gần đây"),
  LEVEL_UP: msg("Thử thách nhẹ để nâng trình độ"),
};

export function RecommendationList({ recommendations }: { recommendations: DashboardRecommendation[] }) {
  const t = useT();
  if (recommendations.length === 0) {
    return <p className="empty-state">{t("Chưa có chủ đề phù hợp để gợi ý.")}</p>;
  }

  return (
    <div className="recommendation-list a5-pill-list">
      {recommendations.map((recommendation) => (
        <Link className="recommendation-card" href={`/topics/${recommendation.slug}?level=${recommendation.level}`} key={`${recommendation.slug}:${recommendation.level}`}>
          <TopicIcon slug={recommendation.slug} />
          <span>
            <strong>{t.dynamic(topicDisplayName(recommendation.slug, recommendation.name))}</strong>
            <small>{t.dynamic(reasonLabels[recommendation.reason])} · {t.dynamic(levelLabels[recommendation.level])} · {recommendation.availableCount} {t("câu hỏi")}</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      ))}
    </div>
  );
}
