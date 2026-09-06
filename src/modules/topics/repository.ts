import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { learnerLevels, type LearnerLevel } from "../profile/types";
import type { GeneralCandidate } from "../questions/general-selection";
import { mapTopicAvailability } from "./availability";
import type { TopicPracticeHistory, TopicSummary } from "./types";

type PracticeSessionHistoryRow = {
  topic_id: string;
  practiced_count: number | string;
  last_practiced_at: string | null;
};

type ActiveGeneralQuestionRow = {
  id: string;
  code: string;
  topicId: string;
  difficulty: LearnerLevel;
  topic: {
    id: string;
    slug: string;
    name: string;
  };
};

type TopicAvailabilityAggregateRow = {
  topic_id: string;
  slug: string;
  name: string;
  difficulty_level: unknown;
  available_count: number | string;
};

type AnswerHistoryRow = {
  question_id: string;
  practice_sessions: { completed_at: string | null } | Array<{ completed_at: string | null }>;
};

function first<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLearnerLevel(value: unknown): value is LearnerLevel {
  return typeof value === "string" && learnerLevels.includes(value as LearnerLevel);
}

function relation(value: unknown): Record<string, unknown> | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  return isObject(item) ? item : undefined;
}

export function filterActiveGeneralQuestionRows(
  rows: readonly unknown[],
  generalModeId: string,
): ActiveGeneralQuestionRow[] {
  const validRows: ActiveGeneralQuestionRow[] = [];

  for (const row of rows) {
    if (!isObject(row)) continue;
    const topic = relation(row.topics);
    const mode = relation(row.practice_modes);
    const questionType = relation(row.question_types);
    if (
      typeof row.id !== "string"
      || typeof row.code !== "string"
      || typeof row.topic_id !== "string"
      || row.status !== "ACTIVE"
      || !isLearnerLevel(row.difficulty_level)
      || !topic
      || topic.id !== row.topic_id
      || topic.mode_id !== generalModeId
      || topic.is_active !== true
      || typeof topic.slug !== "string"
      || typeof topic.name !== "string"
      || !mode
      || mode.id !== generalModeId
      || mode.code !== "GENERAL"
      || mode.is_active !== true
      || !questionType
      || questionType.is_active !== true
    ) continue;

    validRows.push({
      id: row.id,
      code: row.code,
      topicId: row.topic_id,
      difficulty: row.difficulty_level,
      topic: { id: topic.id, slug: topic.slug, name: topic.name },
    });
  }

  return validRows;
}

function mapAvailabilityAggregates(rows: readonly TopicAvailabilityAggregateRow[]) {
  return rows.flatMap((row) => {
    const count = Number(row.available_count);
    return row.topic_id && row.slug && row.name && isLearnerLevel(row.difficulty_level)
      && Number.isSafeInteger(count) && count >= 0 ? [{
        topicId: row.topic_id,
        slug: row.slug,
        name: row.name,
        level: row.difficulty_level,
        count,
      }] : [];
  });
}

function aggregatePracticeHistory(rows: readonly PracticeSessionHistoryRow[]): TopicPracticeHistory[] {
  return rows.flatMap((row) => {
    const practicedCount = Number(row.practiced_count);
    return row.topic_id && Number.isSafeInteger(practicedCount) && practicedCount >= 0 ? [{
      topicId: row.topic_id,
      practicedCount,
      lastPracticedAt: row.last_practiced_at,
    }] : [];
  });
}

async function getActiveGeneralModeId(): Promise<string> {
  const { data, error } = await getSupabaseAdminClient()
    .from("practice_modes")
    .select("id")
    .eq("code", "GENERAL")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new Error("General practice mode is unavailable.");
  return data.id;
}

export async function getAvailableTopics(
  userId: string,
  filters: { search?: string; level?: LearnerLevel } = {},
): Promise<TopicSummary[]> {
  const db = getSupabaseAdminClient();
  const [questionResult, historyResult] = await Promise.all([
    db.rpc("get_general_topic_availability"),
    db.rpc("get_learner_topic_history", { p_user_id: userId }),
  ]);

  if (questionResult.error || historyResult.error) throw new Error("Unable to load available topics.");
  return mapTopicAvailability(
    mapAvailabilityAggregates((questionResult.data ?? []) as TopicAvailabilityAggregateRow[]),
    aggregatePracticeHistory((historyResult.data ?? []) as PracticeSessionHistoryRow[]),
    filters,
  );
}

export async function getGeneralQuestionCandidates(
  userId: string,
  topicId: string,
  difficulty: LearnerLevel,
): Promise<{ candidates: GeneralCandidate[]; recentQuestionIds: string[] }> {
  const db = getSupabaseAdminClient();
  const generalModeId = await getActiveGeneralModeId();
  const { data: questionData, error: questionError } = await db
    .from("questions")
    .select("id,code,topic_id,difficulty_level,status,topics!inner(id,slug,name,mode_id,is_active),practice_modes!inner(id,code,is_active),question_types!inner(is_active)")
    .eq("topic_id", topicId)
    .eq("mode_id", generalModeId)
    .eq("difficulty_level", difficulty)
    .eq("status", "ACTIVE")
    .eq("topics.is_active", true)
    .eq("topics.mode_id", generalModeId)
    .eq("practice_modes.code", "GENERAL")
    .eq("practice_modes.is_active", true)
    .eq("practice_modes.id", generalModeId)
    .eq("question_types.is_active", true)
    .order("code");
  if (questionError) throw new Error("Unable to load General questions.");

  const questions = filterActiveGeneralQuestionRows(questionData ?? [], generalModeId)
    .filter((question) => question.topicId === topicId && question.difficulty === difficulty);
  if (!questions.length) return { candidates: [], recentQuestionIds: [] };

  const { data: historyData, error: historyError } = await db
    .from("session_questions")
    .select("question_id,practice_sessions!inner(completed_at,user_id,mode,status)")
    .in("question_id", questions.map((question) => question.id))
    .eq("practice_sessions.user_id", userId)
    .eq("practice_sessions.mode", "GENERAL")
    .eq("practice_sessions.status", "COMPLETED");
  if (historyError) throw new Error("Unable to load General question history.");

  const lastAnsweredAt = new Map<string, string>();
  for (const row of (historyData ?? []) as AnswerHistoryRow[]) {
    const session = first(row.practice_sessions);
    if (session?.completed_at && (!lastAnsweredAt.has(row.question_id) || session.completed_at > lastAnsweredAt.get(row.question_id)!)) {
      lastAnsweredAt.set(row.question_id, session.completed_at);
    }
  }

  return {
    candidates: questions.map((question) => ({
      id: question.id,
      code: question.code,
      topicId: question.topicId,
      difficulty: question.difficulty,
      lastAnsweredAt: lastAnsweredAt.get(question.id) ?? null,
    })),
    recentQuestionIds: [...lastAnsweredAt.keys()],
  };
}
