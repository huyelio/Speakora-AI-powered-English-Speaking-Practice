import Link from "next/link";
import React from "react";
import type { TopicSummary } from "../../modules/topics/types";

export function TopicGrid({ topics }: { topics: TopicSummary[] }) {
  if (topics.length === 0) {
    return (
      <section className="empty-state topic-empty" role="status">
        <h2>No topics match these filters</h2>
        <p>Clear the search or choose another level to see available practice.</p>
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
              <p>{questionCount} questions available · {topic.levels.map((item) => item.level.toLowerCase()).join(" · ")}</p>
            </div>
            <small>{topic.practicedCount > 0 ? `Practiced ${topic.practicedCount} times` : "New topic"}</small>
          </Link>
        );
      })}
    </div>
  );
}
