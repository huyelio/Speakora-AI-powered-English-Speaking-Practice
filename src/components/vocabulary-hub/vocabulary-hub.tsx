import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";
import { learningStageLabels } from "../../modules/dashboard/next-lesson";
import { topicDisplayName } from "../../modules/topics/display-name";
import type { LearningResumeSummary } from "../../modules/vocabulary-learning/repository";
import { TopicBoard, type TopicCard } from "./topic-board";
import "./vocabulary-hub.css";

export type VocabularyHubProps = { resume: LearningResumeSummary | null; topics: TopicCard[] };

/** Topic-first vocabulary hub: pick a topic, the topic page decides the next step. */
export function VocabularyHub({ resume, topics }: VocabularyHubProps) {
  return (
    <div className="a5-vocab">
      <header className="a5-hub-head">
        <h1>Từ vựng <i>mỗi ngày</i></h1>
        <p>Chọn một chủ đề. Mỗi phiên gồm làm quen, phát âm và nhớ lại từ.</p>
      </header>

      {resume && (
        <Link className="vh-resume" href={`/vocabulary-learning/${resume.sessionId}`}>
          <span>
            <small>Đang học dở</small>
            <strong>{topicDisplayName(resume.topicSlug, resume.topicName)} · {learningStageLabels[resume.stage]}</strong>
          </span>
          <span className="vh-resume-cta">Tiếp tục<ArrowRight aria-hidden="true" size={18} /></span>
        </Link>
      )}

      <section aria-labelledby="vocab-topics-heading">
        <div className="a5-section-head">
          <h2 id="vocab-topics-heading">Chủ đề</h2>
          <span>{topics.length} chủ đề</span>
        </div>
        {topics.length ? <TopicBoard topics={topics} /> : <p className="empty-state">Chưa có chủ đề từ vựng. Hãy quay lại sau.</p>}
      </section>
    </div>
  );
}
