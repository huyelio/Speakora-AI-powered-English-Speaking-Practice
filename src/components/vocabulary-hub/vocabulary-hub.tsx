"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";
import { learningStageLabels } from "../../modules/dashboard/next-lesson";
import { topicDisplayName } from "../../modules/topics/display-name";
import type { LearningResumeSummary } from "../../modules/vocabulary-learning/repository";
import { TopicBoard, type TopicCard } from "./topic-board";
import "./vocabulary-hub.css";
import { useT } from "../../i18n/client";

export type VocabularyHubProps = { resume: LearningResumeSummary | null; topics: TopicCard[] };

/** Topic-first vocabulary hub: pick a topic, the topic page decides the next step. */
export function VocabularyHub({ resume, topics }: VocabularyHubProps) {
  const t = useT();
  return (
    <div className="a5-vocab">
      <header className="a5-hub-head">
        <h1>{t("Từ vựng")} <i>{t("mỗi ngày")}</i></h1>
        <p>{t("Chọn một chủ đề. Mỗi phiên gồm làm quen, phát âm và nhớ lại từ.")}</p>
      </header>

      {resume && (
        <Link className="vh-resume" href={`/vocabulary-learning/${resume.sessionId}`}>
          <span>
            <small>{t("Đang học dở")}</small>
            <strong>{t.dynamic(topicDisplayName(resume.topicSlug, resume.topicName))} · {t.dynamic(learningStageLabels[resume.stage])}</strong>
          </span>
          <span className="vh-resume-cta">{t("Tiếp tục")}<ArrowRight aria-hidden="true" size={18} /></span>
        </Link>
      )}

      <section aria-labelledby="vocab-topics-heading">
        <div className="a5-section-head">
          <h2 id="vocab-topics-heading">{t("Chủ đề")}</h2>
          <span>{topics.length} {t("chủ đề")}</span>
        </div>
        {topics.length ? <TopicBoard topics={topics} /> : <p className="empty-state">{t("Chưa có chủ đề từ vựng. Hãy quay lại sau.")}</p>}
      </section>
    </div>
  );
}
