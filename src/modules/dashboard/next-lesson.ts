import type { LearnerLevel } from "../profile/types";
import type { LearningStage } from "../vocabulary-learning/types";

export const learningStages: readonly LearningStage[] = ["LEARN", "PRONOUNCE", "RECALL", "CONTEXT", "SUMMARY"];
export const learningStageLabels: Readonly<Record<LearningStage, string>> = {
  LEARN: "Làm quen",
  PRONOUNCE: "Phát âm",
  RECALL: "Nhớ từ",
  CONTEXT: "Ngữ cảnh",
  SUMMARY: "Tổng kết",
};

export type NextLessonInput = {
  resume: { sessionId: string; topicSlug: string; topicName: string; stage: LearningStage; cursor: number; total: number } | null;
  recommendation: { slug: string; name: string; level: LearnerLevel } | null;
};

export type NextLesson =
  | {
    kind: "resume";
    href: string;
    topicSlug: string;
    topicName: string;
    stage: LearningStage;
    stageIndex: number;
    /** 1-based position inside the current stage, clamped to the total. */
    position: number;
    total: number;
  }
  | { kind: "topic"; href: string; topicSlug: string; topicName: string; level: LearnerLevel }
  | { kind: "start"; href: string };

/** Resume unfinished vocabulary learning first, then the top topic recommendation. */
export function chooseNextLesson({ resume, recommendation }: NextLessonInput): NextLesson {
  if (resume) {
    const total = Math.max(0, resume.total);
    return {
      kind: "resume",
      href: `/vocabulary-learning/${resume.sessionId}`,
      topicSlug: resume.topicSlug,
      topicName: resume.topicName,
      stage: resume.stage,
      stageIndex: Math.max(0, learningStages.indexOf(resume.stage)),
      position: total === 0 ? 0 : Math.min(total, Math.max(1, resume.cursor + 1)),
      total,
    };
  }
  if (recommendation) {
    return {
      kind: "topic",
      href: `/topics/${encodeURIComponent(recommendation.slug)}`,
      topicSlug: recommendation.slug,
      topicName: recommendation.name,
      level: recommendation.level,
    };
  }
  return { kind: "start", href: "/vocabulary?mode=learn" };
}
