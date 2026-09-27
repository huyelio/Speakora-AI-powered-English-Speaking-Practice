import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import type { PronunciationAnalysisResult } from "../pronunciation-analysis/types";
import type { LearnerLevel } from "../profile/types";
import { isLearnerLevel } from "../vocabulary/selection";
import { classifyPronunciationScore, isWeakPronunciationResult, summarizePronunciationItems } from "./scoring";
import type {
  ClientPronunciationSession,
  PronunciationAttemptForProcessing,
  PronunciationAttemptStatus,
  PronunciationItemSnapshot,
  PronunciationSessionItem,
  PronunciationSessionStatus,
} from "./types";

export const DEFAULT_PRONUNCIATION_ITEM_COUNT = 10;

type SessionRpcRow = {
  session_id: string;
  session_item_id: string;
  vocabulary_item_id: string;
  sequence_no: number;
  item_snapshot: Record<string, unknown>;
};

type SessionRow = {
  id: string;
  user_id: string;
  topic_id: string;
  level: string;
  item_count: number;
  status: PronunciationSessionStatus;
  source_session_id: string | null;
  topics: { id: string; slug: string; name: string } | Array<{ id: string; slug: string; name: string }> | null;
};

type SessionItemRow = {
  id: string;
  vocabulary_item_id: string;
  sequence_no: number;
  snapshot: Record<string, unknown>;
};

type CompletedAttemptRow = {
  id: string;
  session_item_id: string;
  status: PronunciationAttemptStatus;
  provider: string | null;
  normalized_result: PronunciationAnalysisResult | null;
  completed_at: string | null;
  created_at: string;
};

type AttemptProcessingRow = {
  id: string;
  status: PronunciationAttemptStatus;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  duration_ms: number | null;
  processing_started_at: string | null;
  session_item_id: string;
  pronunciation_session_items: {
    id: string;
    session_id: string;
    snapshot: Record<string, unknown>;
    pronunciation_sessions: { user_id: string } | Array<{ user_id: string }> | null;
  } | Array<{
    id: string;
    session_id: string;
    snapshot: Record<string, unknown>;
    pronunciation_sessions: { user_id: string } | Array<{ user_id: string }> | null;
  }> | null;
};

export class InsufficientPronunciationItemsError extends Error {
  constructor(requested: number, available: number) {
    super(`Need ${requested} pronunciation items but only ${available} are available.`);
    this.name = "InsufficientPronunciationItemsError";
  }
}

export class NoWeakPronunciationItemsError extends Error {
  constructor() {
    super("The source session has no weak pronunciation items.");
    this.name = "NoWeakPronunciationItemsError";
  }
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapSnapshot(raw: Record<string, unknown>): PronunciationItemSnapshot {
  const level = isLearnerLevel(raw.level) ? raw.level : "INTERMEDIATE";
  return {
    word: String(raw.word ?? ""),
    pronunciationIpa: String(raw.pronunciation_ipa ?? ""),
    meaningVi: String(raw.meaning_vi ?? ""),
    level,
  };
}

function shuffleUnique<T>(items: T[], count: number, random: () => number): T[] {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("itemCount must be between 1 and 20.");
  }
  if (items.length < count) throw new InsufficientPronunciationItemsError(count, items.length);
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count);
}

function mapCreatedSession(
  rows: SessionRpcRow[],
  topic: { id: string; slug: string; name: string },
  level: LearnerLevel,
  sourceSessionId: string | null,
): ClientPronunciationSession {
  const items = rows.map((row): PronunciationSessionItem => ({
    sessionItemId: row.session_item_id,
    vocabularyItemId: row.vocabulary_item_id,
    sequenceNo: row.sequence_no,
    snapshot: mapSnapshot(row.item_snapshot),
    latestSuccessfulAttempt: null,
  }));
  return {
    sessionId: rows[0].session_id,
    sourceSessionId,
    topic,
    level,
    itemCount: items.length,
    status: "IN_PROGRESS",
    items,
    summary: summarizePronunciationItems(items.map((item) => ({ word: item.snapshot.word, result: null }))),
  };
}

async function getTopic(topicId: string) {
  const { data, error } = await getSupabaseAdminClient()
    .from("topics")
    .select("id, slug, name")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Pronunciation session topic is missing.");
  return { id: data.id, slug: data.slug, name: data.name };
}

export async function listPronunciationTopicAvailability() {
  const { data, error } = await getSupabaseAdminClient()
    .from("vocabulary_items")
    .select("id, level, pronunciation_ipa, topics!inner(id, slug, name, is_active, practice_modes!inner(code, is_active))")
    .eq("status", "ACTIVE")
    .eq("topics.is_active", true)
    .eq("topics.practice_modes.code", "GENERAL")
    .eq("topics.practice_modes.is_active", true)
    .not("pronunciation_ipa", "is", null);
  if (error) throw error;

  const topics = new Map<string, {
    id: string;
    slug: string;
    name: string;
    levels: Map<LearnerLevel, number>;
  }>();
  for (const raw of data ?? []) {
    const row = raw as { level: unknown; pronunciation_ipa: unknown; topics: unknown };
    if (typeof row.pronunciation_ipa !== "string" || !row.pronunciation_ipa.trim()) continue;
    if (!isLearnerLevel(row.level)) continue;
    const topic = unwrapOne(row.topics as { id: string; slug: string; name: string } | Array<{ id: string; slug: string; name: string }> | null);
    if (!topic) continue;
    const aggregate = topics.get(topic.id) ?? { ...topic, levels: new Map<LearnerLevel, number>() };
    aggregate.levels.set(row.level, (aggregate.levels.get(row.level) ?? 0) + 1);
    topics.set(topic.id, aggregate);
  }
  return [...topics.values()]
    .map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      levels: (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as LearnerLevel[])
        .filter((level) => (topic.levels.get(level) ?? 0) > 0)
        .map((level) => ({ level, count: topic.levels.get(level) ?? 0 })),
      totalCount: [...topic.levels.values()].reduce((sum, count) => sum + count, 0),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function createPronunciationSession(
  userId: string,
  topicId: string,
  level: LearnerLevel,
  itemCount = DEFAULT_PRONUNCIATION_ITEM_COUNT,
  random: () => number = Math.random,
): Promise<ClientPronunciationSession> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("vocabulary_items")
    .select("id, word, pronunciation_ipa")
    .eq("topic_id", topicId)
    .eq("level", level)
    .eq("status", "ACTIVE")
    .not("pronunciation_ipa", "is", null);
  if (error) throw error;
  const candidates = ((data ?? []) as Array<{ id: string; word: string; pronunciation_ipa: string | null }>)
    .filter((item) => Boolean(item.pronunciation_ipa?.trim()));
  const selected = shuffleUnique(candidates, itemCount, random);
  const { data: rows, error: rpcError } = await db.rpc("create_pronunciation_session", {
    p_user_id: userId,
    p_topic_id: topicId,
    p_level: level,
    p_item_ids: selected.map((item) => item.id),
    p_source_session_id: null,
  });
  if (rpcError) throw rpcError;
  if (!rows?.length) throw new Error("Unable to create pronunciation session.");
  const topic = await getTopic(topicId);
  return mapCreatedSession(rows as SessionRpcRow[], topic, level, null);
}

export async function getClientPronunciationSession(
  sessionId: string,
  userId: string,
): Promise<ClientPronunciationSession | null> {
  const db = getSupabaseAdminClient();
  const { data: session, error } = await db
    .from("pronunciation_sessions")
    .select("id, user_id, topic_id, level, item_count, status, source_session_id, topics!inner(id, slug, name)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;
  const row = session as SessionRow;
  const topic = unwrapOne(row.topics);
  if (!topic || !isLearnerLevel(row.level)) return null;

  const { data: itemData, error: itemError } = await db
    .from("pronunciation_session_items")
    .select("id, vocabulary_item_id, sequence_no, snapshot")
    .eq("session_id", sessionId)
    .order("sequence_no", { ascending: true });
  if (itemError) throw itemError;
  const itemRows = (itemData ?? []) as SessionItemRow[];
  const itemIds = itemRows.map((item) => item.id);
  let attemptRows: CompletedAttemptRow[] = [];
  if (itemIds.length) {
    const { data: attemptData, error: attemptError } = await db
      .from("pronunciation_attempts")
      .select("id, session_item_id, status, provider, normalized_result, completed_at, created_at")
      .in("session_item_id", itemIds)
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false })
      .order("id", { ascending: false });
    if (attemptError) throw attemptError;
    attemptRows = (attemptData ?? []) as CompletedAttemptRow[];
  }

  const latestByItem = new Map<string, CompletedAttemptRow>();
  for (const attempt of attemptRows) {
    if (attempt.status !== "COMPLETED" || !attempt.normalized_result || !attempt.provider || !attempt.completed_at) continue;
    if (!latestByItem.has(attempt.session_item_id)) latestByItem.set(attempt.session_item_id, attempt);
  }
  const items = itemRows.map((item): PronunciationSessionItem => {
    const attempt = latestByItem.get(item.id) ?? null;
    const result = attempt?.normalized_result ?? null;
    return {
      sessionItemId: item.id,
      vocabularyItemId: item.vocabulary_item_id,
      sequenceNo: item.sequence_no,
      snapshot: mapSnapshot(item.snapshot),
      latestSuccessfulAttempt: attempt && result ? {
        attemptId: attempt.id,
        provider: attempt.provider as string,
        result,
        score: result.overall.accuracy,
        scoreBand: classifyPronunciationScore(result.overall.accuracy),
        completedAt: attempt.completed_at as string,
      } : null,
    };
  });
  return {
    sessionId: row.id,
    sourceSessionId: row.source_session_id,
    topic,
    level: row.level,
    itemCount: row.item_count,
    status: row.status,
    items,
    summary: summarizePronunciationItems(items.map((item) => ({
      word: item.snapshot.word,
      result: item.latestSuccessfulAttempt?.result ?? null,
    }))),
  };
}

export async function createWeakPronunciationSession(
  userId: string,
  sourceSessionId: string,
): Promise<ClientPronunciationSession> {
  const source = await getClientPronunciationSession(sourceSessionId, userId);
  if (!source) throw new Error("Pronunciation source session not found.");
  const weakItems = source.items.filter((item) => (
    item.latestSuccessfulAttempt
      ? isWeakPronunciationResult(item.latestSuccessfulAttempt.result)
      : false
  ));
  if (!weakItems.length) throw new NoWeakPronunciationItemsError();
  const db = getSupabaseAdminClient();
  const { data, error } = await db.rpc("create_pronunciation_session", {
    p_user_id: userId,
    p_topic_id: source.topic.id,
    p_level: source.level,
    p_item_ids: weakItems.map((item) => item.vocabularyItemId),
    p_source_session_id: sourceSessionId,
  });
  if (error) throw error;
  if (!data?.length) throw new Error("Unable to create weak pronunciation session.");
  return mapCreatedSession(data as SessionRpcRow[], source.topic, source.level, sourceSessionId);
}

export async function getPronunciationSessionItemSnapshot(
  sessionId: string,
  userId: string,
  sessionItemId: string,
): Promise<PronunciationItemSnapshot | null> {
  const session = await getClientPronunciationSession(sessionId, userId);
  if (!session) return null;
  return session.items.find((item) => item.sessionItemId === sessionItemId)?.snapshot ?? null;
}

export type RegisterPronunciationAttemptInput = {
  attemptId: string;
  userId: string;
  sessionItemId: string;
  storagePath: string;
  mimeType: string;
  durationMs: number | null;
  sizeBytes: number;
  idempotencyKey: string;
};

export async function registerPronunciationAttempt(input: RegisterPronunciationAttemptInput) {
  const { data, error } = await getSupabaseAdminClient().rpc("register_pronunciation_attempt", {
    p_attempt_id: input.attemptId,
    p_user_id: input.userId,
    p_session_item_id: input.sessionItemId,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_duration_ms: input.durationMs,
    p_size_bytes: input.sizeBytes,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  const row = (data as Array<{ attempt_id: string; attempt_status: PronunciationAttemptStatus }> | null)?.[0];
  if (!row) throw new Error("Unable to register pronunciation attempt.");
  return { attemptId: row.attempt_id, status: row.attempt_status };
}

export type CompletePronunciationAttemptInput = {
  attemptId: string;
  userId: string;
  provider: string;
  normalizedResult: PronunciationAnalysisResult;
  rawResult: unknown;
};

export async function completePronunciationAttempt(input: CompletePronunciationAttemptInput) {
  const { data, error } = await getSupabaseAdminClient().rpc("complete_pronunciation_attempt", {
    p_attempt_id: input.attemptId,
    p_user_id: input.userId,
    p_provider: input.provider,
    p_normalized_result: input.normalizedResult,
    p_raw_result: input.rawResult,
  });
  if (error) throw error;
  const row = (data as Array<{
    attempt_id: string;
    attempt_status: PronunciationAttemptStatus;
    session_id: string;
    session_status: PronunciationSessionStatus;
  }> | null)?.[0];
  if (!row) throw new Error("Unable to complete pronunciation attempt.");
  return {
    attemptId: row.attempt_id,
    status: row.attempt_status,
    sessionId: row.session_id,
    sessionStatus: row.session_status,
  };
}

export async function startPronunciationAttemptProcessing(attemptId: string, userId: string) {
  const attempt = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!attempt) throw new Error("Pronunciation attempt not found.");
  if (attempt.status === "PROCESSING") return attempt;
  if (attempt.status !== "UPLOADED") throw new Error("Pronunciation attempt is not uploaded.");
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .update({
      status: "PROCESSING",
      processing_started_at: now,
      updated_at: now,
    })
    .eq("id", attemptId)
    .eq("status", "UPLOADED");
  if (error) throw error;
  const authoritative = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!authoritative) throw new Error("Pronunciation attempt not found after processing update.");
  return authoritative;
}

export async function claimPronunciationAttemptProcessing(attemptId: string, userId: string) {
  const attempt = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!attempt || attempt.status !== "UPLOADED") return null;
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .update({
      status: "PROCESSING",
      processing_started_at: now,
      updated_at: now,
    })
    .eq("id", attemptId)
    .eq("status", "UPLOADED")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const authoritative = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!authoritative) throw new Error("Pronunciation attempt not found after processing claim.");
  return authoritative;
}

export async function getPronunciationAttemptForProcessing(
  attemptId: string,
  userId: string,
): Promise<PronunciationAttemptForProcessing | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .select("id, status, storage_bucket, storage_path, mime_type, size_bytes, duration_ms, processing_started_at, session_item_id, pronunciation_session_items!inner(id, session_id, snapshot, pronunciation_sessions!inner(user_id))")
    .eq("id", attemptId)
    .eq("pronunciation_session_items.pronunciation_sessions.user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as AttemptProcessingRow;
  const item = unwrapOne(row.pronunciation_session_items);
  const owner = item ? unwrapOne(item.pronunciation_sessions) : null;
  if (!item || !owner || owner.user_id !== userId) return null;
  return {
    attemptId: row.id,
    sessionId: item.session_id,
    sessionItemId: row.session_item_id,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationMs: row.duration_ms,
    processingStartedAt: row.processing_started_at,
    snapshot: mapSnapshot(item.snapshot),
  };
}

export async function findPronunciationAttemptByIdempotency(
  sessionItemId: string,
  idempotencyKey: string,
  userId: string,
): Promise<PronunciationAttemptForProcessing | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .select("id, status, storage_bucket, storage_path, mime_type, size_bytes, duration_ms, processing_started_at, session_item_id, pronunciation_session_items!inner(id, session_id, snapshot, pronunciation_sessions!inner(user_id))")
    .eq("session_item_id", sessionItemId)
    .eq("idempotency_key", idempotencyKey)
    .eq("pronunciation_session_items.pronunciation_sessions.user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as AttemptProcessingRow;
  const item = unwrapOne(row.pronunciation_session_items);
  const owner = item ? unwrapOne(item.pronunciation_sessions) : null;
  if (!item || !owner || owner.user_id !== userId) return null;
  return {
    attemptId: row.id,
    sessionId: item.session_id,
    sessionItemId: row.session_item_id,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationMs: row.duration_ms,
    processingStartedAt: row.processing_started_at,
    snapshot: mapSnapshot(item.snapshot),
  };
}

export async function failPronunciationAttempt(
  attemptId: string,
  userId: string,
  sanitizedErrorCode: string,
  sanitizedErrorMessage: string,
) {
  const attempt = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!attempt) throw new Error("Pronunciation attempt not found.");
  if (attempt.status !== "PROCESSING") return attempt;
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .update({
      status: "FAILED",
      sanitized_error_code: sanitizedErrorCode,
      sanitized_error_message: sanitizedErrorMessage,
      failed_at: now,
      updated_at: now,
    })
    .eq("id", attemptId)
    .eq("status", "PROCESSING");
  if (error) throw error;
  const authoritative = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!authoritative) throw new Error("Pronunciation attempt not found after failure update.");
  return authoritative;
}

export async function getPronunciationAttemptForRetry(
  attemptId: string,
  userId: string,
  now = new Date(),
) {
  const attempt = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!attempt) return null;
  if (attempt.status === "FAILED") return attempt;
  if (attempt.status !== "PROCESSING" || !attempt.processingStartedAt) return null;
  const startedAt = Date.parse(attempt.processingStartedAt);
  return Number.isFinite(startedAt) && startedAt <= now.getTime() - 5 * 60 * 1000 ? attempt : null;
}

export async function retryPronunciationAttempt(
  attemptId: string,
  userId: string,
  now = new Date(),
) {
  const owned = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!owned) throw new Error("Pronunciation attempt not found.");
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
  const processingStartedAt = owned.processingStartedAt ? Date.parse(owned.processingStartedAt) : Number.NaN;
  const retryable = owned.status === "FAILED"
    || (owned.status === "PROCESSING"
      && Number.isFinite(processingStartedAt)
      && processingStartedAt <= staleBefore.getTime());
  if (!retryable) throw new Error("Pronunciation attempt is not retryable.");
  const attempt = owned;
  const nowIso = now.toISOString();
  let update = getSupabaseAdminClient()
    .from("pronunciation_attempts")
    .update({
      status: "PROCESSING",
      provider: null,
      normalized_result: null,
      raw_result: null,
      sanitized_error_code: null,
      sanitized_error_message: null,
      processing_started_at: nowIso,
      completed_at: null,
      failed_at: null,
      updated_at: nowIso,
    })
    .eq("id", attemptId)
    .eq("status", attempt.status);
  if (attempt.status === "PROCESSING") {
    update = update.lte("processing_started_at", staleBefore.toISOString());
  }
  const { data, error } = await update.select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Pronunciation attempt retry was already claimed.");
  const authoritative = await getPronunciationAttemptForProcessing(attemptId, userId);
  if (!authoritative) throw new Error("Pronunciation attempt not found after retry update.");
  return authoritative;
}
