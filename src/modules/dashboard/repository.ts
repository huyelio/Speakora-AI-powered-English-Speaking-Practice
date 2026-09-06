import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { collectRecentRecommendationTags } from "../practice/repository";
import type { PracticeMode } from "../practice/types";
import type { LearnerLevel } from "../profile/types";
import { effectiveCurrentStreak, learnerLocalDate, levelFromXp } from "../progress/rules";
import { rankTopicRecommendations, recommendationTagsForTopic } from "../recommendations/rank";
import { getAvailableTopics } from "../topics/repository";
import type { TopicSummary } from "../topics/types";
import type { DashboardDto, HistoryCursor, HistoryDto, HistoryItem } from "./types";

type DashboardSessionInput = {
  id: string;
  mode?: PracticeMode;
  status: string;
  createdAt?: string;
  completedAt?: string | null;
  difficulty?: LearnerLevel | null;
  topic?: { slug: string; name: string } | null;
  answerCount: number;
  summary?: string | null;
  estimatedBand?: number | null;
};

type DashboardInput = {
  now: Date;
  profile: { displayName: string; level: LearnerLevel; timezone: string };
  goal: { dailyAnswerTarget: number };
  todayProgress: { localDate?: string; completedAnswers: number; dailyAnswerTarget?: number; goalAchievedAt?: string | null } | null;
  streak: { currentStreak: number; longestStreak: number; lastGoalAchievedDate: string | null } | null;
  xpEvents: readonly { amount: number }[];
  topics: readonly TopicSummary[];
  recentSessions: readonly DashboardSessionInput[];
  weaknessTags: readonly string[];
};

type SessionQueryRow = {
  id: string;
  mode: PracticeMode;
  status: string;
  difficulty_level: LearnerLevel | null;
  created_at: string;
  completed_at: string | null;
  topics: unknown;
  session_questions: unknown;
  session_assessments: unknown;
};

const defaultHistoryPageSize = 20;
const maximumHistoryPageSize = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function isSafeTimestamp(value: string): boolean {
  return timestampPattern.test(value) && Number.isFinite(Date.parse(value));
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return typeof relation === "object" && relation !== null
    ? relation as Record<string, unknown>
    : null;
}

function countAnswers(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, question) => {
    if (typeof question !== "object" || question === null) return total;
    const answers = (question as Record<string, unknown>).user_answers;
    return total + (Array.isArray(answers) ? answers.length : answers ? 1 : 0);
  }, 0);
}

function toHistoryInput(row: SessionQueryRow): DashboardSessionInput {
  const topic = firstRelation(row.topics);
  const assessment = firstRelation(row.session_assessments);
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    difficulty: row.difficulty_level,
    topic: topic && typeof topic.slug === "string" && typeof topic.name === "string"
      ? { slug: topic.slug, name: topic.name }
      : null,
    answerCount: countAnswers(row.session_questions),
    summary: typeof assessment?.overall_feedback === "string" ? assessment.overall_feedback : null,
    estimatedBand: typeof assessment?.estimated_band === "number" ? assessment.estimated_band : null,
  };
}

function toHistoryItem(session: DashboardSessionInput): HistoryItem {
  return {
    id: session.id,
    mode: session.mode ?? "GENERAL",
    status: session.status,
    createdAt: session.createdAt ?? "1970-01-01T00:00:00.000Z",
    completedAt: session.completedAt ?? null,
    difficulty: session.difficulty ?? null,
    topic: session.topic ?? null,
    answerCount: session.answerCount,
    summary: session.summary ?? null,
    estimatedBand: session.estimatedBand ?? null,
  };
}

export function mapDashboard(input: DashboardInput): DashboardDto {
  const localDate = learnerLocalDate(input.now, input.profile.timezone);
  const progress = input.todayProgress?.localDate && input.todayProgress.localDate !== localDate
    ? null
    : input.todayProgress;
  const streak = input.streak ?? {
    currentStreak: 0,
    longestStreak: 0,
    lastGoalAchievedDate: null,
  };
  const totalXp = input.xpEvents.reduce((total, event) => total + Number(event.amount), 0);
  const recommendations = rankTopicRecommendations(
    { level: input.profile.level },
    input.topics.map((topic) => ({
      slug: topic.slug,
      levels: topic.levels.map((availability) => availability.level),
      lastPracticedAt: topic.lastPracticedAt,
      tags: recommendationTagsForTopic(topic.slug),
    })),
    input.recentSessions.flatMap((session) => (
      session.mode === "GENERAL" && session.status === "COMPLETED" && session.topic && session.completedAt
        ? [{ topicSlug: session.topic.slug, completedAt: session.completedAt }]
        : []
    )),
    input.weaknessTags,
  ).slice(0, 3).flatMap((recommendation) => {
    const topic = input.topics.find((candidate) => candidate.slug === recommendation.topicSlug);
    const availability = topic?.levels.find((candidate) => candidate.level === recommendation.level);
    return topic && availability ? [{
      slug: topic.slug,
      name: topic.name,
      level: recommendation.level,
      reason: recommendation.reason,
      availableCount: availability.count,
    }] : [];
  });

  return {
    profile: input.profile,
    today: {
      localDate,
      completed: Number(progress?.completedAnswers ?? 0),
      target: Number(progress?.dailyAnswerTarget ?? input.goal.dailyAnswerTarget),
      achieved: progress?.goalAchievedAt != null,
    },
    streak: {
      current: effectiveCurrentStreak({
        current: Number(streak.currentStreak),
        longest: Number(streak.longestStreak),
        lastAchievedDate: streak.lastGoalAchievedDate,
      }, localDate),
      longest: Number(streak.longestStreak),
    },
    totalXp,
    level: levelFromXp(totalXp),
    recommendations,
    recentSessions: input.recentSessions
      .filter((session) => session.status !== "IN_PROGRESS" || session.answerCount > 0)
      .slice(0, 5)
      .map(toHistoryItem),
  };
}

export function encodeHistoryCursor(cursor: HistoryCursor): string {
  if (!isSafeTimestamp(cursor.createdAt) || !uuidPattern.test(cursor.id)) {
    throw new Error("Invalid history cursor.");
  }
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeHistoryCursor(value: string): HistoryCursor {
  try {
    if (!value) throw new Error("empty");
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("shape");
    const cursor = parsed as Record<string, unknown>;
    if (
      typeof cursor.createdAt !== "string"
      || !isSafeTimestamp(cursor.createdAt)
      || typeof cursor.id !== "string"
      || !uuidPattern.test(cursor.id)
      || Object.keys(cursor).some((key) => key !== "createdAt" && key !== "id")
    ) throw new Error("shape");
    return { createdAt: cursor.createdAt, id: cursor.id };
  } catch {
    throw new Error("Invalid history cursor.");
  }
}

export function mapHistory(rows: readonly DashboardSessionInput[], pageSize: number): HistoryDto {
  const sorted = [...rows].sort((left, right) => (
    (right.createdAt ?? "").localeCompare(left.createdAt ?? "")
    || right.id.localeCompare(left.id)
  ));
  const items = sorted.slice(0, pageSize).map(toHistoryItem);
  const last = items.at(-1);
  return {
    items,
    nextCursor: sorted.length > pageSize && last
      ? encodeHistoryCursor({ createdAt: last.createdAt, id: last.id })
      : null,
  };
}

function normalizePageSize(value?: number): number {
  if (value === undefined) return defaultHistoryPageSize;
  if (!Number.isInteger(value) || value < 1 || value > maximumHistoryPageSize) {
    throw new Error(`History page size must be between 1 and ${maximumHistoryPageSize}.`);
  }
  return value;
}

export async function getDashboard(userId: string, now = new Date()): Promise<DashboardDto> {
  const db = getSupabaseAdminClient();
  const [profileResult, goalResult, streakResult, xpResult, assessmentResult, sessionResult, topics] = await Promise.all([
    db.from("profiles").select("display_name,level,timezone").eq("user_id", userId).maybeSingle(),
    db.from("learning_goals").select("daily_answer_target").eq("user_id", userId).maybeSingle(),
    db.from("user_streaks").select("current_streak,longest_streak,last_goal_achieved_date").eq("user_id", userId).maybeSingle(),
    db.rpc("get_learner_xp_total", { p_user_id: userId }),
    db.from("session_assessments")
      .select("raw_output,created_at,practice_sessions!inner(user_id,status)")
      .eq("assessment_mode", "GENERAL")
      .eq("practice_sessions.user_id", userId)
      .eq("practice_sessions.status", "COMPLETED")
      .order("created_at", { ascending: false })
      .limit(2),
    db.from("practice_sessions")
      .select("id,mode,status,difficulty_level,created_at,completed_at,topics(slug,name),session_questions(user_answers(id)),session_assessments(overall_feedback,estimated_band)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(10),
    getAvailableTopics(userId),
  ]);
  if (
    profileResult.error || goalResult.error || streakResult.error || xpResult.error
    || assessmentResult.error || sessionResult.error
  ) throw new Error("Unable to load learner dashboard.");
  if (!profileResult.data || !goalResult.data) throw new Error("Learner profile is unavailable.");

  const localDate = learnerLocalDate(now, profileResult.data.timezone);
  const { data: progress, error: progressError } = await db
    .from("daily_progress")
    .select("local_date,completed_answers,daily_answer_target,goal_achieved_at")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (progressError) throw new Error("Unable to load learner dashboard.");

  const xp = Number(xpResult.data ?? 0);
  if (!Number.isFinite(xp) || xp < 0) throw new Error("Unable to load learner dashboard.");
  return mapDashboard({
    now,
    profile: {
      displayName: profileResult.data.display_name,
      level: profileResult.data.level as LearnerLevel,
      timezone: profileResult.data.timezone,
    },
    goal: { dailyAnswerTarget: Number(goalResult.data.daily_answer_target) },
    todayProgress: progress ? {
      localDate: progress.local_date,
      completedAnswers: Number(progress.completed_answers),
      dailyAnswerTarget: progress.daily_answer_target == null ? undefined : Number(progress.daily_answer_target),
      goalAchievedAt: progress.goal_achieved_at,
    } : null,
    streak: streakResult.data ? {
      currentStreak: Number(streakResult.data.current_streak),
      longestStreak: Number(streakResult.data.longest_streak),
      lastGoalAchievedDate: streakResult.data.last_goal_achieved_date,
    } : null,
    xpEvents: [{ amount: xp }],
    topics,
    recentSessions: ((sessionResult.data ?? []) as SessionQueryRow[]).map(toHistoryInput),
    weaknessTags: collectRecentRecommendationTags(assessmentResult.data ?? []),
  });
}

export async function getHistory(
  userId: string,
  options: { cursor?: HistoryCursor; pageSize?: number } = {},
): Promise<HistoryDto> {
  const pageSize = normalizePageSize(options.pageSize);
  let query = getSupabaseAdminClient()
    .from("practice_sessions")
    .select("id,mode,status,difficulty_level,created_at,completed_at,topics(slug,name),session_questions(user_answers(id)),session_assessments(overall_feedback,estimated_band)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error("Unable to load practice history.");
  return mapHistory(((data ?? []) as SessionQueryRow[]).map(toHistoryInput), pageSize);
}
