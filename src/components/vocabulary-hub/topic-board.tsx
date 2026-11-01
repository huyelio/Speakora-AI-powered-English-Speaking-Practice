"use client";

import Link from "next/link";
import React from "react";
import { topicDisplayName } from "../../modules/topics/display-name";
import { topicStatusLine, type TopicProgress } from "../../modules/vocabulary-learning/topic-progress";
import { TopicIcon } from "../ui/topic-icon";
import { vocabularyTopicHref } from "./hub-model";
import { useT } from "../../i18n/client";

export type TopicCard = Omit<TopicProgress, "words">;

/** Topic cards. Topics have no level of their own: difficulty belongs to each word. */
export function TopicBoard({ topics }: { topics: TopicCard[] }) {
  const t = useT();

  return (
    <>
      <ul className="vh-topics">
        {topics.map(topic => {
          const { MASTERED, total } = topic.counts;
          return (
            <li key={topic.id}>
              <Link className="vh-topic" data-state={topic.action.kind} href={vocabularyTopicHref(topic.slug)}>
                <span className="vh-topic-top">
                  <TopicIcon slug={topic.slug} size={52} />
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
