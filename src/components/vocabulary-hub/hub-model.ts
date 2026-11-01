import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicAction } from "../../modules/vocabulary-learning/topic-progress";
import type { LearningState } from "../../modules/vocabulary-learning/types";
import { msg } from "../../i18n/translate";
import { defaultT, type Translate } from "../../i18n/translate";

export const levelLabels: Record<LearnerLevel, string> = { BEGINNER: msg("Cơ bản"), INTERMEDIATE: msg("Trung cấp"), ADVANCED: msg("Nâng cao") };
export const wordStateLabels: Record<LearningState, string> = { NEW: msg("Mới"), LEARNING: msg("Đang học"), WEAK: msg("Cần ôn"), MASTERED: msg("Đã thuộc") };

/** One line describing what the next "learn" session mixes. Shared by the topic page and the V2 summary. */
export function learnMixDetail(action: Extract<TopicAction, { kind: "learn" }>, t: Translate = defaultT): string {
  if (action.review && action.fresh) return t("Gồm {0} từ cần ôn và {1} từ mới.", action.review, action.fresh);
  return action.review ? t("Ôn lại {0} từ bạn đang học.", action.review) : t("{0} từ mới, chưa học lần nào.", action.fresh);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTopicSlug(value: string | string[] | undefined): string | undefined {
  const slug = first(value)?.trim();
  return slug && /^[a-z0-9-]{1,80}$/.test(slug) ? slug : undefined;
}

export function vocabularyTopicHref(slug: string): string {
  return `/vocabulary/topics/${encodeURIComponent(slug)}`;
}

/**
 * The hub used to open per-mode setup forms via `?mode=learn|review|pronounce&topic=`.
 * Those links (bookmarks, old redirects) now land on the topic page, or the plain hub.
 */
export function legacyHubRedirect(params: { mode?: string | string[]; topic?: string | string[] }): string | null {
  if (params.mode === undefined && params.topic === undefined) return null;
  const topic = parseTopicSlug(params.topic);
  return topic ? vocabularyTopicHref(topic) : "/vocabulary";
}
