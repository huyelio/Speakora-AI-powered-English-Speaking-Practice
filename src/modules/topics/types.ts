import type { LearnerLevel } from "../profile/types";

export type TopicLevelAvailability = {
  level: LearnerLevel;
  count: number;
};

export type TopicSummary = {
  id: string;
  slug: string;
  name: string;
  levels: TopicLevelAvailability[];
  practicedCount: number;
  lastPracticedAt: string | null;
};

export type TopicAvailabilityRow = {
  topicId: string;
  slug: string;
  name: string;
  level: LearnerLevel;
  count: number;
};

export type TopicPracticeHistory = {
  topicId: string;
  practicedCount: number;
  lastPracticedAt: string | null;
};
