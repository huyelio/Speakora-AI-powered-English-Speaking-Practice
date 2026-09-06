import Link from "next/link";
import React from "react";
import type { DashboardRecommendation } from "../../modules/dashboard/types";

const reasonLabels: Record<DashboardRecommendation["reason"], string> = {
  LEVEL_MATCH: "Suitable for your current level",
  NEW_TOPIC: "Try a new conversation topic",
  WEAKNESS_MATCH: "Practice a recent improvement area",
  LEVEL_UP: "A gentle next-level challenge",
};

export function RecommendationList({ recommendations }: { recommendations: DashboardRecommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="empty-state">Recommendations will appear when topics are available.</p>;
  }

  return (
    <div className="recommendation-list">
      {recommendations.map((recommendation) => (
        <Link className="recommendation-card" href={`/topics/${recommendation.slug}`} key={`${recommendation.slug}:${recommendation.level}`}>
          <span aria-hidden="true" className="topic-avatar">{recommendation.name.slice(0, 1)}</span>
          <span>
            <strong>{recommendation.name}</strong>
            <small>{reasonLabels[recommendation.reason]} · {recommendation.level.toLowerCase()} · {recommendation.availableCount} questions</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
