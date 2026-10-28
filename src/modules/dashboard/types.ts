import type { LearnerLevel } from "../profile/types";
import type { PracticeMode } from "../practice/types";
import type { RecommendationReason } from "../recommendations/rank";

export type DashboardRecommendation = {
  slug: string;
  name: string;
  level: LearnerLevel;
  reason: RecommendationReason;
  availableCount: number;
};

export type HistoryItem = {
  id: string;
  mode: PracticeMode;
  status: string;
  createdAt: string;
  completedAt: string | null;
  difficulty: LearnerLevel | null;
  topic: { slug: string; name: string } | null;
  answerCount: number;
  summary: string | null;
  estimatedBand: number | null;
};

export type DashboardDto = {
  profile: {
    displayName: string;
    level: LearnerLevel;
    timezone: string;
  };
  today: {
    localDate: string;
    completed: number;
    target: number;
    achieved: boolean;
  };
  streak: { current: number; longest: number };
  totalXp: number;
  level: number;
  recommendations: DashboardRecommendation[];
  recentSessions: HistoryItem[];
};

export type HistoryDto = {
  items: HistoryItem[];
  nextCursor: string | null;
};

export type HistoryCursor = { createdAt: string; id: string };

export type ConversationHistoryItem = {
  kind: "CONVERSATION";
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  title: string;
  turnCount: number;
  goalsCompleted: number;
  goalsTotal: number;
  stars: number;
  summary: string | null;
};

/** One row of /history: a practice session or an AI role-play, newest first. */
export type ActivityHistoryItem = ({ kind: "PRACTICE" } & HistoryItem) | ConversationHistoryItem;

export type ActivityHistoryDto = {
  items: ActivityHistoryItem[];
  nextCursor: string | null;
};

