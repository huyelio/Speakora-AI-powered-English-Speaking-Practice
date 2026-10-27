import type { LearnerLevel } from "../../modules/profile/types";
import type { LearningState } from "../../modules/vocabulary-learning/types";

export const levelLabels: Record<LearnerLevel, string> = { BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" };
export const wordStateLabels: Record<LearningState, string> = { NEW: "Mới", LEARNING: "Đang học", WEAK: "Cần ôn", MASTERED: "Đã thuộc" };

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
