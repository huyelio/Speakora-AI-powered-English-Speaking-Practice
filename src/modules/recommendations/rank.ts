import { learnerLevels, type LearnerLevel } from "../profile/types";

export type RecommendationReason = "LEVEL_MATCH" | "NEW_TOPIC" | "WEAKNESS_MATCH" | "LEVEL_UP";

export type Recommendation = {
  topicSlug: string;
  level: LearnerLevel;
  reason: RecommendationReason;
};

export type RecommendationTopic = {
  slug: string;
  levels: readonly LearnerLevel[];
  lastPracticedAt: string | null;
  tags?: readonly string[];
};

export type RecommendationSession = {
  topicSlug: string;
  completedAt: string;
};

type RankedTopic = Recommendation & {
  levelPriority: number;
  practicedPriority: number;
  practicedAt: number;
  weaknessPriority: number;
};

export function rankTopicRecommendations(
  profile: { level: LearnerLevel },
  topics: readonly RecommendationTopic[],
  recentSessions: readonly RecommendationSession[],
  weaknessTags: readonly string[],
): Recommendation[] {
  const recent = [...recentSessions].sort(
    (left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt) || left.topicSlug.localeCompare(right.topicSlug),
  );
  const mostRecentSlug = recent[0]?.topicSlug;
  const profileIndex = learnerLevels.indexOf(profile.level);
  const nextLevel = learnerLevels[profileIndex + 1];
  const eligible = topics.flatMap((topic) => {
    if (topic.levels.includes(profile.level)) return [{ topic, level: profile.level }];
    if (nextLevel && topic.levels.includes(nextLevel)) return [{ topic, level: nextLevel }];
    return [];
  });
  const candidates = eligible.length > 1 && mostRecentSlug
    ? eligible.filter(({ topic }) => topic.slug !== mostRecentSlug)
    : eligible;
  const normalizedWeaknesses = new Set(weaknessTags.map((tag) => tag.toUpperCase()));

  return candidates
    .map(({ topic, level }): RankedTopic => {
      const levelPriority = level === profile.level ? 0 : 1;
      const practicedPriority = topic.lastPracticedAt === null ? 0 : 1;
      const practicedAt = topic.lastPracticedAt === null
        ? Number.NEGATIVE_INFINITY
        : Date.parse(topic.lastPracticedAt);
      const topicTags = topic.tags?.map((tag) => tag.toUpperCase())
        ?? [topic.slug.replaceAll("-", "_").toUpperCase()];
      const weaknessMatch = topicTags.some((tag) => normalizedWeaknesses.has(tag));
      const reason: RecommendationReason = level === nextLevel
        ? "LEVEL_UP"
        : weaknessMatch
          ? "WEAKNESS_MATCH"
          : topic.lastPracticedAt === null
            ? "NEW_TOPIC"
            : "LEVEL_MATCH";
      return {
        topicSlug: topic.slug,
        level,
        reason,
        levelPriority,
        practicedPriority,
        practicedAt,
        weaknessPriority: weaknessMatch ? 0 : 1,
      };
    })
    .sort((left, right) => (
      left.levelPriority - right.levelPriority
      || left.practicedPriority - right.practicedPriority
      || left.practicedAt - right.practicedAt
      || left.weaknessPriority - right.weaknessPriority
      || left.topicSlug.localeCompare(right.topicSlug)
    ))
    .map(({ topicSlug, level, reason }) => ({ topicSlug, level, reason }));
}
