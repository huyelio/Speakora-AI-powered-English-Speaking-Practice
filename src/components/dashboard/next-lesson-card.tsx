"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { learningStageLabels, learningStages, type NextLesson } from "../../modules/dashboard/next-lesson";
import { learnerLevelLabels } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { TopicIcon } from "../ui/topic-icon";
import "./home.css";
import { useT } from "../../i18n/client";
import { defaultT, type Translate } from "../../i18n/translate";

function copyFor(lesson: NextLesson, t: Translate = defaultT) {
  if (lesson.kind === "resume") {
    const topic = t.dynamic(topicDisplayName(lesson.topicSlug, lesson.topicName));
    return {
      title: <>{t("Học tiếp")} <i>{t("bộ từ")}</i> {topic}</>,
      why: t("Bạn đang dừng ở bước {0}{1}. Học tiếp để hoàn thành bộ từ này.", t.dynamic(learningStageLabels[lesson.stage]), lesson.position > 0 ? t(", từ thứ {0} trên {1}", lesson.position, lesson.total) : ""),
      cta: t("Học tiếp"),
    };
  }
  if (lesson.kind === "topic") {
    const topic = t.dynamic(topicDisplayName(lesson.topicSlug, lesson.topicName));
    return {
      title: <>{t("Luyện nói")} <i>{t("về")}</i> {topic}</>,
      why: t("Chủ đề hợp với trình độ {0} của bạn: trả lời 5 câu hỏi và nhận nhận xét từ AI.", learnerLevelLabels[lesson.level]),
      cta: t("Bắt đầu"),
    };
  }
  return {
    title: <>{t("Học bộ từ")} <i>{t("đầu tiên")}</i></>,
    why: t("Chọn một chủ đề, làm quen với từ mới, luyện phát âm rồi kiểm tra trí nhớ."),
    cta: t("Chọn chủ đề"),
  };
}

/** The home page's single primary action. */
export function NextLessonCard({ lesson }: { lesson: NextLesson }) {
  const t = useT();
  const { title, why, cta } = copyFor(lesson, t);
  return (
    <article className="a5-quest" aria-labelledby="next-lesson-title">
      <div className="a5-quest-copy">
        <span className="a5-badge"><Sparkles aria-hidden="true" size={16} />{t("Bài nên học hôm nay")}</span>
        <h2 id="next-lesson-title">{title}</h2>
        <p className="a5-quest-why">{why}</p>
        {lesson.kind === "resume" && (
          <ol className="a5-chips" aria-label={t("Tiến độ 5 bước")}>
            {learningStages.map((stage, index) => (
              <li
                aria-current={index === lesson.stageIndex ? "step" : undefined}
                className={index < lesson.stageIndex ? "is-done" : index === lesson.stageIndex ? "is-now" : undefined}
                key={stage}
              >
                {index < lesson.stageIndex && <Check aria-hidden="true" size={14} />}
                {t.dynamic(learningStageLabels[stage])}
              </li>
            ))}
          </ol>
        )}
        <div className="a5-quest-foot">
          <Link className="a5-btn" href={lesson.href}>{cta}<ArrowRight aria-hidden="true" size={18} /></Link>
          {lesson.kind === "topic" && <Link className="a5-text-link" href="/vocabulary">{t("Hoặc học từ vựng")}</Link>}
        </div>
      </div>
      <div className="a5-rainbow" aria-hidden="true">
        <span className="a5-arc a5-arc-1" /><span className="a5-arc a5-arc-2" /><span className="a5-arc a5-arc-3" />
        <span className="a5-arc a5-arc-4" /><span className="a5-arc a5-arc-5" />
        <div className="a5-rainbow-label">
          {lesson.kind === "resume" && lesson.total > 0
            ? <><b>{lesson.position}/{lesson.total}</b><span>{t("Bước")} {lesson.stageIndex + 1} {t("trên 5")}<br />{t.dynamic(learningStageLabels[lesson.stage])}</span></>
            : lesson.kind === "topic"
              ? <span className="a5-rainbow-topic"><TopicIcon slug={lesson.topicSlug} size={96} /></span>
              : <b>A–Z</b>}
        </div>
      </div>
    </article>
  );
}
