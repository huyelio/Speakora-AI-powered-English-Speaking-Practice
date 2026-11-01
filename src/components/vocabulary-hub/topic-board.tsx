"use client";

import Link from "next/link";
import React, { useState } from "react";
import { learnerLevels, type LearnerLevel } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { topicStatusLine, type TopicProgress } from "../../modules/vocabulary-learning/topic-progress";
import { TopicIcon } from "../ui/topic-icon";
import { levelLabels, vocabularyTopicHref } from "./hub-model";
import { useT } from "../../i18n/client";

export type TopicCard = Omit<TopicProgress, "words">;

/** Topic cards with a client-side level filter, so filtering never waits on the server. */
export function TopicBoard({ topics }: { topics: TopicCard[] }) {
  const t = useT();
  const levels = learnerLevels.filter(level => topics.some(topic => topic.level === level));
  const [filter, setFilter] = useState<LearnerLevel | null>(null);
  const shown = filter ? topics.filter(topic => topic.level === filter) : topics;

  return (
    <>
      {levels.length > 1 && (
        <div className="vh-filter" role="group" aria-label={t("Lọc theo trình độ")}>
          <button aria-pressed={filter === null} onClick={() => setFilter(null)} type="button">{t("Tất cả")}</button>
          {levels.map(level => (
            <button aria-pressed={filter === level} key={level} onClick={() => setFilter(level)} type="button">{t.dynamic(levelLabels[level])}</button>
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
                  <span className="vh-level">{t.dynamic(levelLabels[topic.level])}</span>
                </span>
                <strong>{t.dynamic(topicDisplayName(topic.slug, topic.name))}</strong>
                <span className="vh-meter" role="img" aria-label={t("Đã thuộc {0} trên {1} từ", MASTERED, total)}>
                  <span style={{ width: `${total ? (MASTERED / total) * 100 : 0}%` }} />
                </span>
                <span className="vh-topic-foot">
                  <span>{topicStatusLine(topic.counts, t)}</span>
                  <small>{topic.action.kind === "resume" ? t("Đang học dở") : t("{0}/{1} đã thuộc", MASTERED, total)}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
