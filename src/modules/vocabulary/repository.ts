import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import type { SessionPrincipal } from "../practice/auth";
import type { LearnerLevel } from "../profile/types";
import { DEFAULT_VOCABULARY_ITEM_COUNT } from "./constants";
import { isLearnerLevel, selectVocabularyItems } from "./selection";
import {
  buildFirstLetterHint,
  type ClientVocabularySession,
  type VocabularyItemSnapshot,
  type VocabularyReviewResult,
  type VocabularySessionItem,
} from "./types";

type RpcRow = {
  session_id: string;
  session_item_id: string;
  sequence_no: number;
  item_snapshot: Record<string, unknown>;
};

type SessionRow = {
  id: string;
  user_id: string;
  topic_id: string;
  level: string;
  item_count: number;
  status: "IN_PROGRESS" | "COMPLETED";
  topics: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] | null;
};

type SessionItemRow = {
  id: string;
  vocabulary_item_id: string;
  sequence_no: number;
  snapshot: Record<string, unknown>;
  vocabulary_reviews: { result: VocabularyReviewResult } | { result: VocabularyReviewResult }[] | null;
};

export class InsufficientVocabularyItemsError extends Error {
  constructor(topicId: string, level: LearnerLevel, requested: number, available: number) {
    super(`Chủ đề này chỉ có ${available} từ vựng ${level} khả dụng; cần ${requested} từ.`);
    this.name = "InsufficientVocabularyItemsError";
    void topicId;
  }
}

function mapSnapshot(raw: Record<string, unknown>): VocabularyItemSnapshot {
  const word = String(raw.word ?? "");
  return {
    word,
    meaning_vi: String(raw.meaning_vi ?? ""),
    definition_en: raw.definition_en == null ? null : String(raw.definition_en),
    example_sentence: String(raw.example_sentence ?? ""),
    pronunciation_ipa: raw.pronunciation_ipa == null ? null : String(raw.pronunciation_ipa),
    level: isLearnerLevel(raw.level) ? raw.level : "INTERMEDIATE",
    first_letter_hint: typeof raw.first_letter_hint === "string"
      ? raw.first_letter_hint
      : buildFirstLetterHint(word),
  };
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function createVocabularySession(
  userId: string,
  topicId: string,
  level: LearnerLevel,
  itemCount: number = DEFAULT_VOCABULARY_ITEM_COUNT,
) {
  const db = getSupabaseAdminClient();
  const { data: candidates, error: candidateError } = await db
    .from("vocabulary_items")
    .select("id, word")
    .eq("topic_id", topicId)
    .eq("level", level)
    .eq("status", "ACTIVE");
  if (candidateError) throw candidateError;

  const pool = (candidates ?? []) as { id: string; word: string }[];
  let selected;
  try {
    selected = selectVocabularyItems(pool, itemCount);
  } catch {
    throw new InsufficientVocabularyItemsError(topicId, level, itemCount, pool.length);
  }

  const { data, error } = await db.rpc("create_vocabulary_session", {
    p_user_id: userId,
    p_topic_id: topicId,
    p_level: level,
    p_item_ids: selected.map((item) => item.id),
  });
  if (error) throw error;

  const rows = data as RpcRow[];
  if (!rows?.length) throw new Error("Unable to create vocabulary session.");

  const { data: topicRow, error: topicError } = await db
    .from("topics")
    .select("id, slug, name")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError) throw topicError;
  if (!topicRow) throw new Error("Vocabulary session topic is missing.");

  return {
    sessionId: rows[0].session_id,
    topic: { id: topicRow.id, slug: topicRow.slug, name: topicRow.name },
    level,
    itemCount: rows.length,
    status: "IN_PROGRESS" as const,
    items: rows.map((row): VocabularySessionItem => ({
      sessionItemId: row.session_item_id,
      sequenceNo: row.sequence_no,
      vocabularyItemId: selected[row.sequence_no - 1]?.id ?? "",
      snapshot: mapSnapshot(row.item_snapshot),
      review: null,
    })),
  };
}

export async function authorizeVocabularySession(
  sessionId: string,
  principal: SessionPrincipal,
): Promise<{ id: string; userId: string } | null> {
  if (principal.kind !== "user") return null;
  const { data, error } = await getSupabaseAdminClient()
    .from("vocabulary_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== principal.userId) return null;
  return { id: data.id, userId: data.user_id };
}

export async function getClientVocabularySession(
  sessionId: string,
  userId: string,
): Promise<ClientVocabularySession | null> {
  const db = getSupabaseAdminClient();
  const { data: session, error } = await db
    .from("vocabulary_sessions")
    .select("id, user_id, topic_id, level, item_count, status, topics!inner(id, slug, name)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const row = session as SessionRow;
  const topic = unwrapOne(row.topics);
  if (!topic) return null;

  const { data: items, error: itemsError } = await db
    .from("vocabulary_session_items")
    .select("id, vocabulary_item_id, sequence_no, snapshot, vocabulary_reviews(result)")
    .eq("session_id", sessionId)
    .order("sequence_no", { ascending: true });
  if (itemsError) throw itemsError;

  const mapped = ((items ?? []) as SessionItemRow[]).map((item): VocabularySessionItem => {
    const review = unwrapOne(item.vocabulary_reviews);
    return {
      sessionItemId: item.id,
      sequenceNo: item.sequence_no,
      vocabularyItemId: item.vocabulary_item_id,
      snapshot: mapSnapshot(item.snapshot),
      review: review?.result ?? null,
    };
  });

  const rememberedCount = mapped.filter((item) => item.review === "REMEMBERED").length;
  const notRememberedCount = mapped.filter((item) => item.review === "NOT_REMEMBERED").length;

  return {
    sessionId: row.id,
    topic: { id: topic.id, slug: topic.slug, name: topic.name },
    level: isLearnerLevel(row.level) ? row.level : "INTERMEDIATE",
    itemCount: row.item_count,
    status: row.status,
    items: mapped,
    rememberedCount,
    notRememberedCount,
  };
}

export async function saveVocabularyReview(
  sessionId: string,
  userId: string,
  sessionItemId: string,
  result: VocabularyReviewResult,
): Promise<ClientVocabularySession> {
  const db = getSupabaseAdminClient();
  const session = await getClientVocabularySession(sessionId, userId);
  if (!session) throw new Error("Vocabulary session not found.");

  const item = session.items.find((entry) => entry.sessionItemId === sessionItemId);
  if (!item) throw new Error("Vocabulary session item not found.");

  const { error: reviewError } = await db.from("vocabulary_reviews").upsert(
    {
      session_item_id: sessionItemId,
      result,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: "session_item_id" },
  );
  if (reviewError) throw reviewError;

  const updated = await getClientVocabularySession(sessionId, userId);
  if (!updated) throw new Error("Vocabulary session not found after review.");

  const allReviewed = updated.items.every((entry) => entry.review !== null);
  if (allReviewed && updated.status !== "COMPLETED") {
    const { error: completeError } = await db
      .from("vocabulary_sessions")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (completeError) throw completeError;
    const completed = await getClientVocabularySession(sessionId, userId);
    if (!completed) throw new Error("Vocabulary session not found after completion.");
    return completed;
  }

  return updated;
}

export async function getVocabularySessionItemSnapshot(
  sessionId: string,
  userId: string,
  sessionItemId: string,
): Promise<VocabularyItemSnapshot | null> {
  const session = await getClientVocabularySession(sessionId, userId);
  if (!session) return null;
  return session.items.find((item) => item.sessionItemId === sessionItemId)?.snapshot ?? null;
}

export async function listVocabularyTopicAvailability(userId: string) {
  void userId;
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("vocabulary_items")
    .select("topic_id, level, topics!inner(id, slug, name, is_active, practice_modes!inner(code, is_active))")
    .eq("status", "ACTIVE")
    .eq("topics.is_active", true)
    .eq("topics.practice_modes.code", "GENERAL")
    .eq("topics.practice_modes.is_active", true);
  if (error) throw error;

  type Agg = {
    id: string;
    slug: string;
    name: string;
    levels: Map<LearnerLevel, number>;
  };
  const byTopic = new Map<string, Agg>();

  for (const row of data ?? []) {
    const topic = unwrapOne((row as { topics: unknown }).topics) as {
      id: string;
      slug: string;
      name: string;
    } | null;
    if (!topic) continue;
    const level = (row as { level: string }).level;
    if (!isLearnerLevel(level)) continue;
    const current = byTopic.get(topic.id) ?? {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      levels: new Map(),
    };
    current.levels.set(level, (current.levels.get(level) ?? 0) + 1);
    byTopic.set(topic.id, current);
  }

  return [...byTopic.values()]
    .map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      levels: (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as LearnerLevel[])
        .filter((level) => (topic.levels.get(level) ?? 0) > 0)
        .map((level) => ({ level, count: topic.levels.get(level) ?? 0 })),
      totalCount: [...topic.levels.values()].reduce((sum, n) => sum + n, 0),
    }))
    .filter((topic) => topic.totalCount > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
