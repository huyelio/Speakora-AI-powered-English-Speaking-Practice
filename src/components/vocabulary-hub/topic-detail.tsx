"use client";

import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { topicDisplayName } from "../../modules/topics/display-name";
import type { TopicProgress } from "../../modules/vocabulary-learning/topic-progress";
import type { LearningState } from "../../modules/vocabulary-learning/types";
import { TopicIcon } from "../ui/topic-icon";
import { wordStateLabels } from "./hub-model";
import { TopicActions } from "./topic-actions";
import "./vocabulary-hub.css";
import { useT } from "../../i18n/client";

const stateOrder: LearningState[] = ["MASTERED", "LEARNING", "WEAK", "NEW"];

export function TopicDetail({ topic }: { topic: TopicProgress }) {
  const t = useT();
  const name = t.dynamic(topicDisplayName(topic.slug, topic.name));
  return (
    <div className="a5-vocab vt-page">
      <Link className="back-link vt-back" href="/vocabulary"><ArrowLeft aria-hidden="true" size={18} />{t("Từ vựng")}</Link>

      <header className="vt-head">
        <TopicIcon slug={topic.slug} size={76} />
        <div>
          <h1>{name}</h1>
          <ul className="vt-counts" aria-label={t("Tiến độ chủ đề")}>
            {stateOrder.map(state => (
              <li data-state={state} key={state}><strong>{topic.counts[state]}</strong> {t.dynamic(wordStateLabels[state]).toLowerCase()}</li>
            ))}
          </ul>
        </div>
      </header>

      <section className="a5-panel vt-next" aria-label={t("Bước tiếp theo")}>
        <TopicActions action={topic.action} level={topic.level} topicId={topic.id} total={topic.counts.total} />
      </section>

      <section className="a5-section" aria-labelledby="topic-words-heading">
        <div className="a5-section-head">
          <h2 id="topic-words-heading">{t("Từ trong chủ đề")}</h2>
          <span>{topic.counts.total} {t("từ")}</span>
        </div>
        <ul className="vt-words">
          {topic.words.map(word => (
            <li key={word.id}>
              <span className="vt-word"><span className="vt-word-name"><strong lang="en">{word.word}</strong>{word.cefrLevel ? <span className="vh-level vt-cefr">{word.cefrLevel}</span> : null}</span><small lang="en">{word.ipa}</small></span>
              <span className="vt-meaning">{word.meaningVi}</span>
              <span className="vt-state" data-state={word.state}>{t.dynamic(wordStateLabels[word.state])}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
