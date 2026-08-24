import type { LearnerLevel } from "../profile/types";
import type { TopicAvailabilityRow, TopicPracticeHistory, TopicSummary } from "./types";

const minimumQuestionsPerSession = 5;

const learnerLevelOrder: readonly LearnerLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export function mapTopicAvailability(
  availability: readonly TopicAvailabilityRow[],
  practiceHistory: readonly TopicPracticeHistory[],
  filters: { search?: string; level?: LearnerLevel } = {},
): TopicSummary[] {
  const historyByTopic = new Map(practiceHistory.map((history) => [history.topicId, history]));
  const topics = new Map<string, TopicSummary>();

  for (const row of availability) {
    if (row.count < minimumQuestionsPerSession || (filters.level && row.level !== filters.level)) continue;

    const topic = topics.get(row.topicId) ?? {
      id: row.topicId,
      slug: row.slug,
      name: row.name,
      levels: [],
      practicedCount: historyByTopic.get(row.topicId)?.practicedCount ?? 0,
      lastPracticedAt: historyByTopic.get(row.topicId)?.lastPracticedAt ?? null,
    };
    topic.levels.push({ level: row.level, count: row.count });
    topics.set(row.topicId, topic);
  }

  const search = filters.search?.trim().toLocaleLowerCase();
  return [...topics.values()]
    .map((topic) => ({
      ...topic,
      levels: topic.levels.sort((left, right) => learnerLevelOrder.indexOf(left.level) - learnerLevelOrder.indexOf(right.level)),
    }))
    .filter((topic) => !search || topic.name.toLocaleLowerCase().includes(search) || topic.slug.toLocaleLowerCase().includes(search))
    .sort((left, right) => left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug));
}
