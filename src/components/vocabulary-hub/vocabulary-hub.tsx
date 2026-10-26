import Link from "next/link";
import React, { type ReactNode } from "react";
import { ArrowRight, AudioLines, Layers, Sprout, type LucideIcon } from "lucide-react";
import { learningStageLabels } from "../../modules/dashboard/next-lesson";
import { topicDisplayName } from "../../modules/topics/display-name";
import type { LearningResumeSummary } from "../../modules/vocabulary-learning/repository";
import { TopicIcon } from "../ui/topic-icon";
import { vocabularyHref, vocabularyModes, type VocabularyMode } from "./hub-model";
import "./vocabulary-hub.css";

type HubTopic = { slug: string; name: string; totalCount: number };

const arches: Record<VocabularyMode, { Icon: LucideIcon; title: string; detail: string; foot: string }> = {
  learn: { Icon: Sprout, title: "Học từ mới", detail: "Làm quen, phát âm, nhớ từ, ngữ cảnh rồi tổng kết.", foot: "Bắt đầu học" },
  review: { Icon: Layers, title: "Ôn nhanh", detail: "Xem nghĩa, đoán trong đầu, lật thẻ rồi tự chấm.", foot: "Lật thẻ" },
  pronounce: { Icon: AudioLines, title: "Phát âm từ", detail: "Nghe mẫu, ghi âm, biết âm tiết nào cần sửa.", foot: "Luyện phát âm" },
};

export type VocabularyHubProps = {
  mode: VocabularyMode | null;
  topic?: string;
  resume: LearningResumeSummary | null;
  topics: HubTopic[];
  /** The existing setup component for the selected mode. */
  panel?: ReactNode;
};

export function VocabularyHub({ mode, topic, resume, topics, panel }: VocabularyHubProps) {
  return (
    <div className="a5-vocab">
      <header className="a5-vocab-head">
        <h1>Từ vựng <i>mỗi ngày</i></h1>
        <p>Ba cánh cửa, ba cách học. Bạn vào cửa nào hôm nay?</p>
      </header>

      {mode ? (
        <>
          <nav className="a5-mode-tabs" aria-label="Cách học từ vựng">
            <Link href={vocabularyHref(null, topic)}>Tất cả</Link>
            {vocabularyModes.map((entry) => (
              <Link aria-current={entry.mode === mode ? "page" : undefined} href={vocabularyHref(entry.mode, topic)} key={entry.mode}>
                {entry.label}
              </Link>
            ))}
          </nav>
          <section className="a5-mode-panel" aria-label={vocabularyModes.find((entry) => entry.mode === mode)?.label}>
            {panel}
          </section>
        </>
      ) : (
        <>
          <div className="a5-arches">
            {vocabularyModes.map(({ mode: entry }) => {
              const { Icon, title, detail, foot } = arches[entry];
              const resumeNote = entry === "learn" && resume
                ? `Đang học dở: ${topicDisplayName(resume.topicSlug, resume.topicName)} · ${learningStageLabels[resume.stage]}`
                : null;
              return (
                <Link className="a5-arch" data-mode={entry} href={vocabularyHref(entry, topic)} key={entry}>
                  <span className="a5-arch-icon" aria-hidden="true"><Icon size={30} /></span>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                  {resumeNote && <small className="a5-arch-note">{resumeNote}</small>}
                  <span className="a5-arch-foot">{foot}<ArrowRight aria-hidden="true" size={18} /></span>
                </Link>
              );
            })}
          </div>

          <section className="a5-section" aria-labelledby="vocab-topics-heading">
            <div className="a5-section-head">
              <h2 id="vocab-topics-heading">Chủ đề</h2>
              <span>{topics.length} chủ đề có từ kèm phiên âm</span>
            </div>
            {topics.length ? (
              <div className="a5-topic-pills">
                {topics.map((entry) => (
                  <Link href={vocabularyHref("learn", entry.slug)} key={entry.slug}>
                    <TopicIcon slug={entry.slug} size={30} />
                    {topicDisplayName(entry.slug, entry.name)}
                    <small>{entry.totalCount} từ</small>
                  </Link>
                ))}
              </div>
            ) : <p className="empty-state">Chưa có chủ đề từ vựng. Hãy quay lại sau.</p>}
          </section>
        </>
      )}
    </div>
  );
}
