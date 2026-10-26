import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";
import { TopicIcon } from "../ui/topic-icon";
import type { DashboardRecommendation } from "../../modules/dashboard/types";
import type { LearnerLevel } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const reasonLabels: Record<DashboardRecommendation["reason"], string> = {
  LEVEL_MATCH: "Phù hợp với trình độ hiện tại",
  NEW_TOPIC: "Thử một chủ đề trò chuyện mới",
  WEAKNESS_MATCH: "Luyện thêm nội dung cần cải thiện gần đây",
  LEVEL_UP: "Thử thách nhẹ để nâng trình độ",
};

export function RecommendationList({ recommendations }: { recommendations: DashboardRecommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="empty-state">Chưa có chủ đề phù hợp để gợi ý.</p>;
  }

  return (
    <div className="recommendation-list a5-pill-list">
      {recommendations.map((recommendation) => (
        <Link className="recommendation-card" href={`/topics/${recommendation.slug}?level=${recommendation.level}`} key={`${recommendation.slug}:${recommendation.level}`}>
          <TopicIcon slug={recommendation.slug} />
          <span>
            <strong>{topicDisplayName(recommendation.slug, recommendation.name)}</strong>
            <small>{reasonLabels[recommendation.reason]} · {levelLabels[recommendation.level]} · {recommendation.availableCount} câu hỏi</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      ))}
    </div>
  );
}
