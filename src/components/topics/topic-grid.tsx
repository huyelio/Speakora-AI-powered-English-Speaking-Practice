"use client";

import Link from "next/link";
import React from "react";
import { learnerLevelLabels, type LearnerLevel } from "../../modules/profile/types";
import type { TopicSummary } from "../../modules/topics/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { TopicIllustration } from "./topic-illustration";
import { useT } from "../../i18n/client";

/** `level` (from the hub filter) is passed on so the topic page preselects it. */
export function TopicGrid({ topics, level }: { topics: TopicSummary[]; level?: LearnerLevel }) {
  const t = useT();
  if (topics.length === 0) {
    return (
      <section className="empty-state topic-empty" role="status">
        <h2>{t("Không tìm thấy chủ đề phù hợp")}</h2>
        <p>{t("Hãy xóa từ khóa hoặc chọn trình độ khác.")}</p>
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
              <h2>{t.dynamic(topicDisplayName(topic.slug, topic.name))}</h2>
              <p>{questionCount} {t("câu hỏi ·")} {topic.levels.map((item) => learnerLevelLabels[item.level]).join(" · ")}</p>
              <small>{topic.practicedCount > 0 ? t("Đã luyện {0} lần", topic.practicedCount) : t("Chủ đề mới")}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
