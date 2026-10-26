import Link from "next/link";
import React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { learningStageLabels, learningStages, type NextLesson } from "../../modules/dashboard/next-lesson";
import type { LearnerLevel } from "../../modules/profile/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { TopicIcon } from "../ui/topic-icon";
import "./home.css";

const levelLabels: Record<LearnerLevel, string> = { BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" };

function copyFor(lesson: NextLesson) {
  if (lesson.kind === "resume") {
    const topic = topicDisplayName(lesson.topicSlug, lesson.topicName);
    return {
      title: <>Học tiếp <i>bộ từ</i> {topic}</>,
      why: `Bạn đang dừng ở bước ${learningStageLabels[lesson.stage]}${lesson.position > 0 ? `, từ thứ ${lesson.position} trên ${lesson.total}` : ""}. Học tiếp để hoàn thành bộ từ này.`,
      cta: "Học tiếp",
    };
  }
  if (lesson.kind === "topic") {
    const topic = topicDisplayName(lesson.topicSlug, lesson.topicName);
    return {
      title: <>Luyện nói <i>về</i> {topic}</>,
      why: `Chủ đề hợp với trình độ ${levelLabels[lesson.level]} của bạn: trả lời 5 câu hỏi và nhận nhận xét từ AI.`,
      cta: "Bắt đầu",
    };
  }
  return {
    title: <>Học bộ từ <i>đầu tiên</i></>,
    why: "Chọn một chủ đề, làm quen với từ mới, luyện phát âm rồi kiểm tra trí nhớ.",
    cta: "Chọn chủ đề",
  };
}

/** The home page's single primary action. */
export function NextLessonCard({ lesson }: { lesson: NextLesson }) {
  const { title, why, cta } = copyFor(lesson);
  return (
    <article className="a5-quest" aria-labelledby="next-lesson-title">
      <div className="a5-quest-copy">
        <span className="a5-badge"><Sparkles aria-hidden="true" size={16} />Bài nên học hôm nay</span>
        <h2 id="next-lesson-title">{title}</h2>
        <p className="a5-quest-why">{why}</p>
        {lesson.kind === "resume" && (
          <ol className="a5-chips" aria-label="Tiến độ 5 bước">
            {learningStages.map((stage, index) => (
              <li
                aria-current={index === lesson.stageIndex ? "step" : undefined}
                className={index < lesson.stageIndex ? "is-done" : index === lesson.stageIndex ? "is-now" : undefined}
                key={stage}
              >
                {index < lesson.stageIndex && <Check aria-hidden="true" size={14} />}
                {learningStageLabels[stage]}
              </li>
            ))}
          </ol>
        )}
        <div className="a5-quest-foot">
          <Link className="a5-btn" href={lesson.href}>{cta}<ArrowRight aria-hidden="true" size={18} /></Link>
          {lesson.kind === "topic" && <Link className="a5-text-link" href="/vocabulary?mode=learn">Hoặc học từ vựng</Link>}
        </div>
      </div>
      <div className="a5-rainbow" aria-hidden="true">
        <span className="a5-arc a5-arc-1" /><span className="a5-arc a5-arc-2" /><span className="a5-arc a5-arc-3" />
        <span className="a5-arc a5-arc-4" /><span className="a5-arc a5-arc-5" />
        <div className="a5-rainbow-label">
          {lesson.kind === "resume" && lesson.total > 0
            ? <><b>{lesson.position}/{lesson.total}</b><span>Bước {lesson.stageIndex + 1} trên 5<br />{learningStageLabels[lesson.stage]}</span></>
            : lesson.kind === "topic"
              ? <span className="a5-rainbow-topic"><TopicIcon slug={lesson.topicSlug} size={96} /></span>
              : <b>A–Z</b>}
        </div>
      </div>
    </article>
  );
}
