import type { LearnerLevel } from "../profile/types";
import { deriveState, EMPTY_EVIDENCE, selectItems } from "./rules";
import type { LearningEvidence, LearningState } from "./types";

/** One ACTIVE vocabulary item with IPA, i.e. a Vocabulary Learning V2 candidate. */
export type TopicWordRow = {
  id: string;
  topicId: string;
  topicSlug: string;
  topicName: string;
  level: LearnerLevel;
  word: string;
  ipa: string;
  meaningVi: string;
};
export type TopicWord = { id: string; word: string; ipa: string; meaningVi: string; state: LearningState };
export type TopicCounts = Record<LearningState, number> & { total: number };
export type TopicAction =
  | { kind: "resume"; sessionId: string }
  | { kind: "learn"; count: number; review: number; fresh: number }
  | { kind: "review-mastered"; count: number };
export type TopicProgress = {
  id: string;
  slug: string;
  name: string;
  /** Level used for every session started from this topic. */
  level: LearnerLevel;
  counts: TopicCounts;
  words: TopicWord[];
  action: TopicAction;
};

const levelOrder: LearnerLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

/** Profile level when the topic has words at it, otherwise the level with most words (lower level on ties). */
export function chooseTopicLevel(levels: Map<LearnerLevel, number>, profileLevel: LearnerLevel | null): LearnerLevel | null {
  if (profileLevel && (levels.get(profileLevel) ?? 0) > 0) return profileLevel;
  let best: LearnerLevel | null = null;
  for (const level of levelOrder) {
    if ((levels.get(level) ?? 0) > (best ? levels.get(best) ?? 0 : 0)) best = level;
  }
  return best;
}

/** Mirrors createLearningSession: the next session takes up to six WEAK → LEARNING → NEW words. */
export function chooseTopicAction(words: { id: string; evidence: LearningEvidence }[], resumeSessionId: string | null): TopicAction {
  if (resumeSessionId) return { kind: "resume", sessionId: resumeSessionId };
  const next = selectItems(words);
  if (!next.length) return { kind: "review-mastered", count: Math.min(6, words.length) };
  const fresh = next.filter(word => deriveState(word.evidence) === "NEW").length;
  return { kind: "learn", count: next.length, review: next.length - fresh, fresh };
}

export function buildTopicProgress(
  rows: TopicWordRow[],
  history: Record<string, LearningEvidence | undefined>,
  profileLevel: LearnerLevel | null,
  /** Unfinished V2 session id per topic id. */
  resumeByTopic: Record<string, string>,
): TopicProgress[] {
  const byTopic = new Map<string, TopicWordRow[]>();
  for (const row of rows) byTopic.set(row.topicId, [...(byTopic.get(row.topicId) ?? []), row]);

  const topics: TopicProgress[] = [];
  for (const [topicId, topicRows] of byTopic) {
    const levels = new Map<LearnerLevel, number>();
    for (const row of topicRows) levels.set(row.level, (levels.get(row.level) ?? 0) + 1);
    const level = chooseTopicLevel(levels, profileLevel);
    if (!level) continue;
    const scoped = topicRows.filter(row => row.level === level).map(row => ({ ...row, evidence: history[row.id] ?? EMPTY_EVIDENCE }));
    const counts: TopicCounts = { NEW: 0, LEARNING: 0, WEAK: 0, MASTERED: 0, total: scoped.length };
    const words = scoped
      .map(row => ({ id: row.id, word: row.word, ipa: row.ipa, meaningVi: row.meaningVi, state: deriveState(row.evidence) }))
      .sort((a, b) => a.word.localeCompare(b.word));
    for (const word of words) counts[word.state] += 1;
    topics.push({
      id: topicId,
      slug: topicRows[0].topicSlug,
      name: topicRows[0].topicName,
      level,
      counts,
      words,
      action: chooseTopicAction(scoped, resumeByTopic[topicId] ?? null),
    });
  }
  return sortTopics(topics, profileLevel);
}

/** In-progress topic first, then topics with weak words, then the learner's level, then by name. */
export function sortTopics(topics: TopicProgress[], profileLevel: LearnerLevel | null): TopicProgress[] {
  const rank = (topic: TopicProgress) =>
    topic.action.kind === "resume" ? 0 : topic.counts.WEAK > 0 ? 1 : topic.level === profileLevel ? 2 : 3;
  return [...topics].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The one status line shown on a hub card. */
export function topicStatusLine(counts: TopicCounts): string {
  if (counts.WEAK > 0) return `${counts.WEAK} từ cần ôn`;
  if (counts.NEW === counts.total) return `${counts.total} từ mới`;
  if (counts.NEW > 0) return `${counts.NEW} từ mới`;
  if (counts.LEARNING > 0) return `${counts.LEARNING} từ đang học`;
  return "Đã thuộc hết";
}
