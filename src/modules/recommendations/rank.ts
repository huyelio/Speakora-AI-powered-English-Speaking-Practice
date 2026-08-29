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

function selectedLevel(profileLevel: LearnerLevel, topicLevels: readonly LearnerLevel[]): LearnerLevel {
  if (topicLevels.includes(profileLevel)) return profileLevel;
  const profileIndex = learnerLevels.indexOf(profileLevel);
  const nextLevel = learnerLevels[profileIndex + 1];
  if (nextLevel && topicLevels.includes(nextLevel)) return nextLevel;
  return [...topicLevels].sort(
    (left, right) => Math.abs(learnerLevels.indexOf(left) - profileIndex) - Math.abs(learnerLevels.indexOf(right) - profileIndex),
  )[0] ?? profileLevel;
}

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
  const candidates = topics.length > 1 && mostRecentSlug
    ? topics.filter((topic) => topic.slug !== mostRecentSlug)
    : [...topics];
  const normalizedWeaknesses = new Set(weaknessTags.map((tag) => tag.toUpperCase()));

  return candidates
    .map((topic): RankedTopic => {
      const level = selectedLevel(profile.level, topic.levels);
      const levelPriority = topic.levels.includes(profile.level) ? 0 : 1;
      const practicedPriority = topic.lastPracticedAt === null ? 0 : 1;
      const practicedAt = topic.lastPracticedAt === null
        ? Number.NEGATIVE_INFINITY
        : Date.parse(topic.lastPracticedAt);
      const topicTags = topic.tags?.map((tag) => tag.toUpperCase())
        ?? [topic.slug.replaceAll("-", "_").toUpperCase()];
      const weaknessMatch = topicTags.some((tag) => normalizedWeaknesses.has(tag));
      const reason: RecommendationReason = level !== profile.level
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
