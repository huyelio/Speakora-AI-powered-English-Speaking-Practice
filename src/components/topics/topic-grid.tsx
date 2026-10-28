import Link from "next/link";
import React from "react";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicSummary } from "../../modules/topics/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { TopicIllustration } from "./topic-illustration";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

/** `level` (from the hub filter) is passed on so the topic page preselects it. */
export function TopicGrid({ topics, level }: { topics: TopicSummary[]; level?: LearnerLevel }) {
  if (topics.length === 0) {
    return (
      <section className="empty-state topic-empty" role="status">
        <h2>Không tìm thấy chủ đề phù hợp</h2>
        <p>Hãy xóa từ khóa hoặc chọn trình độ khác.</p>
      </section>
    );
  }

  return (
    <div className="topic-grid session-topic-grid">
      {topics.map((topic) => {
        const questionCount = topic.levels.reduce((total, item) => total + item.count, 0);
        return (
          <Link className="topic-card session-topic-card" href={`/topics/${topic.slug}${level ? `?level=${level}` : ""}`} key={topic.id}>
            <TopicIllustration name={topic.name} slug={topic.slug} />
            <div className="session-topic-copy">
              <h2>{topicDisplayName(topic.slug, topic.name)}</h2>
              <p>{questionCount} câu hỏi · {topic.levels.map((item) => levelLabels[item.level]).join(" · ")}</p>
              <small>{topic.practicedCount > 0 ? `Đã luyện ${topic.practicedCount} lần` : "Chủ đề mới"}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
