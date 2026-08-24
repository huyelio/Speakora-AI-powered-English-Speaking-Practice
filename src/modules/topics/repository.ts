import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import type { LearnerLevel } from "../profile/types";
import type { GeneralCandidate } from "../questions/general-selection";
import { mapTopicAvailability } from "./availability";
import type { TopicAvailabilityRow, TopicPracticeHistory, TopicSummary } from "./types";

type QuestionAvailabilityRow = {
  topic_id: string;
  difficulty_level: LearnerLevel;
  topics: { id: string; slug: string; name: string } | Array<{ id: string; slug: string; name: string }>;
};

type PracticeSessionHistoryRow = {
  topic_id: string;
  completed_at: string | null;
};

type GeneralQuestionRow = {
  id: string;
  code: string;
  topic_id: string;
  difficulty_level: LearnerLevel;
};

type AnswerHistoryRow = {
  question_id: string;
  practice_sessions: { completed_at: string | null } | Array<{ completed_at: string | null }>;
};

function one<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

function aggregateAvailability(rows: readonly QuestionAvailabilityRow[]): TopicAvailabilityRow[] {
  const aggregates = new Map<string, TopicAvailabilityRow>();
  for (const row of rows) {
    const topic = one(row.topics);
    if (!topic) continue;
    const key = `${row.topic_id}:${row.difficulty_level}`;
    const existing = aggregates.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    aggregates.set(key, {
      topicId: topic.id,
      slug: topic.slug,
      name: topic.name,
      level: row.difficulty_level,
      count: 1,
    });
  }
  return [...aggregates.values()];
}

function aggregatePracticeHistory(rows: readonly PracticeSessionHistoryRow[]): TopicPracticeHistory[] {
  const history = new Map<string, TopicPracticeHistory>();
  for (const row of rows) {
    if (!row.topic_id) continue;
    const existing = history.get(row.topic_id) ?? {
      topicId: row.topic_id,
      practicedCount: 0,
      lastPracticedAt: null,
    };
    existing.practicedCount += 1;
    if (row.completed_at && (!existing.lastPracticedAt || row.completed_at > existing.lastPracticedAt)) {
      existing.lastPracticedAt = row.completed_at;
    }
    history.set(row.topic_id, existing);
  }
  return [...history.values()];
}

export async function getAvailableTopics(
  userId: string,
  filters: { search?: string; level?: LearnerLevel } = {},
): Promise<TopicSummary[]> {
  const db = getSupabaseAdminClient();
  const [questionResult, historyResult] = await Promise.all([
    db
      .from("questions")
      .select("topic_id,difficulty_level,topics!inner(id,slug,name),practice_modes!inner(code,is_active),question_types!inner(is_active)")
      .eq("status", "ACTIVE")
      .eq("practice_modes.code", "GENERAL")
      .eq("practice_modes.is_active", true)
      .eq("topics.is_active", true)
      .eq("question_types.is_active", true)
      .not("topic_id", "is", null),
    db
      .from("practice_sessions")
      .select("topic_id,completed_at")
      .eq("user_id", userId)
      .eq("mode", "GENERAL")
      .eq("status", "COMPLETED")
      .not("topic_id", "is", null),
  ]);

  if (questionResult.error || historyResult.error) throw new Error("Unable to load available topics.");
  return mapTopicAvailability(
    aggregateAvailability((questionResult.data ?? []) as QuestionAvailabilityRow[]),
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
  const { data: questionData, error: questionError } = await db
    .from("questions")
    .select("id,code,topic_id,difficulty_level,topics!inner(id,is_active),practice_modes!inner(code,is_active),question_types!inner(is_active)")
    .eq("topic_id", topicId)
    .eq("difficulty_level", difficulty)
    .eq("status", "ACTIVE")
    .eq("topics.is_active", true)
    .eq("practice_modes.code", "GENERAL")
    .eq("practice_modes.is_active", true)
    .eq("question_types.is_active", true)
    .order("code");
  if (questionError) throw new Error("Unable to load General questions.");

  const questions = (questionData ?? []) as GeneralQuestionRow[];
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
    const session = one(row.practice_sessions);
    if (session?.completed_at && (!lastAnsweredAt.has(row.question_id) || session.completed_at > lastAnsweredAt.get(row.question_id)!)) {
      lastAnsweredAt.set(row.question_id, session.completed_at);
    }
  }

  return {
    candidates: questions.map((question) => ({
      id: question.id,
      code: question.code,
      topicId: question.topic_id,
      difficulty: question.difficulty_level,
      lastAnsweredAt: lastAnsweredAt.get(question.id) ?? null,
    })),
    recentQuestionIds: [...lastAnsweredAt.keys()],
  };
}
