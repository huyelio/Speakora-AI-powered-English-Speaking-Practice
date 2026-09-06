import Link from "next/link";
import React from "react";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicSummary } from "../../modules/topics/types";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export function TopicGrid({ topics }: { topics: TopicSummary[] }) {
  if (topics.length === 0) {
    return (
      <section className="empty-state topic-empty" role="status">
        <h2>Không tìm thấy chủ đề phù hợp</h2>
        <p>Hãy xóa từ khóa hoặc chọn trình độ khác.</p>
      </section>
    );
  }

  return (
    <div className="topic-grid">
      {topics.map((topic) => {
        const questionCount = topic.levels.reduce((total, item) => total + item.count, 0);
        return (
          <Link className="topic-card" href={`/topics/${topic.slug}`} key={topic.id}>
            <span aria-hidden="true" className="topic-avatar large">{topic.name.slice(0, 1)}</span>
            <div>
              <h2>{topic.name}</h2>
              <p>{questionCount} câu hỏi · {topic.levels.map((item) => levelLabels[item.level]).join(" · ")}</p>
            </div>
            <small>{topic.practicedCount > 0 ? `Đã luyện ${topic.practicedCount} lần` : "Chủ đề mới"}</small>
          </Link>
        );
      })}
    </div>
  );
}
