import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { getClientPronunciationSession } from "../pronunciation-practice/repository";
import type { LearnerLevel } from "../profile/types";
import { contextPrompt, deriveState, EMPTY_EVIDENCE, selectItems } from "./rules";
import { LearningError } from "./errors";
import type { LearningEvidence, LearningItem, LearningSession, LearningStage } from "./types";

type Candidate = { id: string; word: string; example: string; evidence: LearningEvidence };
export type CreateInput = { topicId: string; level: LearnerLevel; requestId: string; sourceSessionId?: string; masteredOnly: boolean };
function databaseError(error: { message: string }) {
  const code = error.message;
  if (["SESSION_NOT_FOUND", "ITEM_NOT_FOUND"].includes(code)) throw new LearningError(code, "Không tìm thấy phiên học hoặc từ.", 404);
  if (["STAGE_CONFLICT", "PRONUNCIATION_PENDING", "REQUEST_CONFLICT", "SELECTION_CHANGED"].includes(code)) {
    throw new LearningError(code, "Tiến độ đã thay đổi hoặc bản ghi chưa có kết quả. Hãy tải lại phiên học.", 409);
  }
  if (["INVALID_SOURCE", "INVALID_SOURCE_ITEMS", "NO_WEAK_ITEMS", "INVALID_ANSWER", "INVALID_ITEMS"].includes(code)) {
    throw new LearningError(code, "Lựa chọn hoặc câu trả lời không hợp lệ.");
  }
  throw new Error("Vocabulary learning database operation failed.");
}
export async function getLatestLearningSessionId(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdminClient().from("vocabulary_sessions").select("id")
    .eq("user_id", userId).eq("session_kind", "LEARNING_V2").eq("status", "IN_PROGRESS")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  if (error) databaseError(error);
  return data?.id ?? null;
}
export type LearningResumeSummary = {
  sessionId: string; topicSlug: string; topicName: string; stage: LearningStage; cursor: number; total: number;
};
/** One-query summary of the latest unfinished session, for the home recommendation card. */
export async function getLearningResumeSummary(userId: string): Promise<LearningResumeSummary | null> {
  const { data, error } = await getSupabaseAdminClient().from("vocabulary_sessions")
    .select("id,item_count,learning_stage,learning_cursor,learning_metadata,topics(slug,name)")
    .eq("user_id", userId).eq("session_kind", "LEARNING_V2").eq("status", "IN_PROGRESS")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  if (error) databaseError(error);
  if (!data) return null;
  const topic = (Array.isArray(data.topics) ? data.topics[0] : data.topics) as { slug: string; name: string } | null;
  const stage = data.learning_stage as LearningStage;
  const contextIds = (data.learning_metadata as { contextItemIds?: string[] } | null)?.contextItemIds ?? [];
  return {
    sessionId: data.id, topicSlug: topic?.slug ?? "", topicName: topic?.name ?? "",
    stage, cursor: Number(data.learning_cursor), total: stage === "CONTEXT" ? contextIds.length : Number(data.item_count),
  };
}
export async function getLearningSession(sessionId: string, userId: string): Promise<LearningSession | null> {
  const db = getSupabaseAdminClient();
  const { data: s, error } = await db.from("vocabulary_sessions")
    .select("id, level, learning_stage, learning_cursor, learning_metadata, pronunciation_session_id")
    .eq("id", sessionId).eq("user_id", userId).eq("session_kind", "LEARNING_V2").maybeSingle();
  if (error) databaseError(error);
  if (!s) return null;
  const { data: rows, error: itemError } = await db.from("vocabulary_session_items")
    .select("id,vocabulary_item_id,sequence_no,snapshot,vocabulary_reviews(result,context_result)")
    .eq("session_id", sessionId).order("sequence_no");
  if (itemError) databaseError(itemError);
  const { data: history, error: historyError } = await db.rpc("get_vocabulary_learning_history", {
    p_user_id: userId, p_item_ids: (rows ?? []).map(row => row.vocabulary_item_id),
  });
  if (historyError) databaseError(historyError);
  const pronunciation = await getClientPronunciationSession(s.pronunciation_session_id, userId);
  if (!pronunciation) throw new Error("Linked pronunciation session missing.");
  return {
    sessionId: s.id, topic: pronunciation.topic, level: s.level as LearnerLevel,
    stage: s.learning_stage as LearningStage, cursor: s.learning_cursor,
    contextItemIds: s.learning_metadata.contextItemIds ?? [], pronunciation,
    items: (rows ?? []).map(row => {
      const review = Array.isArray(row.vocabulary_reviews) ? row.vocabulary_reviews[0] : row.vocabulary_reviews;
      return { sessionItemId: row.id, vocabularyItemId: row.vocabulary_item_id, sequenceNo: row.sequence_no,
        snapshot: row.snapshot, review: review?.result ?? null, contextResult: review?.context_result ?? null,
        evidence: history?.[row.vocabulary_item_id] ?? EMPTY_EVIDENCE } as LearningItem;
    }),
  };
}
export async function createLearningSession(userId: string, input: CreateInput): Promise<LearningSession> {
  const db = getSupabaseAdminClient();
  // Reconcile a lost create response before selection; history may have changed since the first call.
  const { data: previous, error: previousError } = await db.from("vocabulary_sessions")
    .select("id,topic_id,level,learning_metadata").eq("user_id", userId).eq("creation_request_id", input.requestId).maybeSingle();
  if (previousError) databaseError(previousError);
  if (previous) {
    if (previous.topic_id !== input.topicId || previous.level !== input.level
      || (previous.learning_metadata.sourceSessionId ?? null) !== (input.sourceSessionId ?? null)
      || previous.learning_metadata.masteredOnly !== input.masteredOnly) throw new LearningError("REQUEST_CONFLICT", "Mã tạo phiên đã được dùng cho lựa chọn khác.", 409);
    const session = await getLearningSession(previous.id, userId);
    if (!session) throw new Error("Learning session missing.");
    return session;
  }
  const { data, error } = await db.rpc("get_vocabulary_learning_candidates", {
    p_user_id: userId, p_topic_id: input.topicId, p_level: input.level,
  });
  if (error) databaseError(error);
  let candidates = (data ?? []) as Candidate[];
  if (input.sourceSessionId) {
    const source = await getLearningSession(input.sourceSessionId, userId);
    if (!source || source.stage !== "SUMMARY" || source.topic.id !== input.topicId || source.level !== input.level) {
      throw new LearningError("INVALID_SOURCE", "Phiên nguồn không hợp lệ.", 404);
    }
    const ids = new Set(source.items.map(item => item.vocabularyItemId));
    candidates = candidates.filter(item => ids.has(item.id) && deriveState(item.evidence) === "WEAK");
  }
  const selected = selectItems(candidates, input.masteredOnly);
  if (!selected.length) {
    if (!input.sourceSessionId && !input.masteredOnly && candidates.length) {
      throw new LearningError("ALL_MASTERED", "Bạn đã vững bộ từ này. Có thể chọn ôn lại hoặc đổi chủ đề.", 409);
    }
    throw new LearningError("NO_ITEMS", "Không có từ phù hợp để luyện trong lựa chọn này.", 409);
  }
  const { data: sessionId, error: createError } = await db.rpc("create_vocabulary_learning_session", {
    p_user_id: userId, p_topic_id: input.topicId, p_level: input.level, p_request_id: input.requestId,
    p_item_ids: selected.map(item => item.id),
    p_context_prompts: Object.fromEntries(selected.map(item => [item.id, contextPrompt(item.word, item.example)])),
    p_source_session_id: input.sourceSessionId ?? null, p_mastered_only: input.masteredOnly,
  });
  if (createError) databaseError(createError);
  const session = await getLearningSession(sessionId as string, userId);
  if (!session) throw new Error("Created learning session missing.");
  return session;
}
export async function mutateLearningSession(sessionId: string, userId: string, action: "advance" | "answer",
  input: { sessionItemId: string; stage: string; answer: string | null }) {
  const { data, error } = await getSupabaseAdminClient().rpc("mutate_vocabulary_learning_session", {
    p_session_id: sessionId, p_user_id: userId, p_action: action, p_stage: input.stage,
    p_item_id: input.sessionItemId, p_answer: input.answer,
  });
  if (error) databaseError(error);
  const session = await getLearningSession(sessionId, userId);
  if (!session) throw new LearningError("SESSION_NOT_FOUND", "Không tìm thấy phiên học.", 404);
  return action === "advance" ? session : { session, correct: data.correct as boolean, word: data.word as string };
}
