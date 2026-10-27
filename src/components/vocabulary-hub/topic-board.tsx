"use client";

import Link from "next/link";
import React, { useState } from "react";
import { learnerLevels, type LearnerLevel } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { topicStatusLine, type TopicProgress } from "../../modules/vocabulary-learning/topic-progress";
import { TopicIcon } from "../ui/topic-icon";
import { levelLabels, vocabularyTopicHref } from "./hub-model";

export type TopicCard = Omit<TopicProgress, "words">;

/** Topic cards with a client-side level filter, so filtering never waits on the server. */
export function TopicBoard({ topics }: { topics: TopicCard[] }) {
  const levels = learnerLevels.filter(level => topics.some(topic => topic.level === level));
  const [filter, setFilter] = useState<LearnerLevel | null>(null);
  const shown = filter ? topics.filter(topic => topic.level === filter) : topics;

  return (
    <>
      {levels.length > 1 && (
        <div className="vh-filter" role="group" aria-label="Lọc theo trình độ">
          <button aria-pressed={filter === null} onClick={() => setFilter(null)} type="button">Tất cả</button>
          {levels.map(level => (
            <button aria-pressed={filter === level} key={level} onClick={() => setFilter(level)} type="button">{levelLabels[level]}</button>
          ))}
        </div>
      )}
      <ul className="vh-topics">
        {shown.map(topic => {
          const { MASTERED, total } = topic.counts;
          return (
            <li key={topic.id}>
              <Link className="vh-topic" data-state={topic.action.kind} href={vocabularyTopicHref(topic.slug)}>
                <span className="vh-topic-top">
                  <TopicIcon slug={topic.slug} size={52} />
                  <span className="vh-level">{levelLabels[topic.level]}</span>
                </span>
                <strong>{topicDisplayName(topic.slug, topic.name)}</strong>
                <span className="vh-meter" role="img" aria-label={`Đã thuộc ${MASTERED} trên ${total} từ`}>
                  <span style={{ width: `${total ? (MASTERED / total) * 100 : 0}%` }} />
                </span>
                <span className="vh-topic-foot">
                  <span>{topicStatusLine(topic.counts)}</span>
                  <small>{topic.action.kind === "resume" ? "Đang học dở" : `${MASTERED}/${total} đã thuộc`}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
