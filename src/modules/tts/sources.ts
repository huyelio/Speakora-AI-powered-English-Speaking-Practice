import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { conversationStore } from "../conversation/repository";
import { findConversationScenario } from "../conversation/scenario";
import type { SessionPrincipal } from "../practice/auth";
import { authorizeSession, questionBelongsToSession } from "../practice/repository";
import { questionSpeech, rolePlaySpeech, wordSpeech, type SpeechRequest } from "./voices";

export const ttsKinds = ["vocabulary", "pronunciation", "question", "conversation"] as const;
export type TtsKind = (typeof ttsKinds)[number];

/** `cacheable` is true only for fixed bank text that every learner hears identically. */
export type ResolvedSpeech = SpeechRequest & { cacheable: boolean };

type SnapshotRow = { snapshot: { word?: unknown } | null };

/** One owned session item's word, read in a single query instead of loading the whole session. */
async function ownedWord(table: "vocabulary_session_items" | "pronunciation_session_items", userId: string, sessionId: string, itemId: string) {
  const parent = table === "vocabulary_session_items" ? "vocabulary_sessions" : "pronunciation_sessions";
  const { data, error } = await getSupabaseAdminClient().from(table)
    .select(`snapshot, ${parent}!inner(user_id)`)
    .eq("id", itemId).eq("session_id", sessionId).eq(`${parent}.user_id`, userId)
    .maybeSingle();
  if (error) throw error;
  const word = (data as SnapshotRow | null)?.snapshot?.word;
  return typeof word === "string" && word.trim() ? word : null;
}

/**
 * Authorizes the principal against one session item and returns what to speak.
 * Null means not found or not owned; callers answer 404 without saying which.
 */
export async function resolveSpeech(kind: TtsKind, principal: SessionPrincipal, sessionId: string, itemId: string): Promise<ResolvedSpeech | null> {
  if (kind === "question") {
    if (!await authorizeSession(sessionId, principal)) return null;
    const question = await questionBelongsToSession(sessionId, itemId);
    const prompt = (question?.prompt_snapshot as { prompt_text?: unknown } | undefined)?.prompt_text;
    return typeof prompt === "string" && prompt.trim() ? { ...questionSpeech(prompt), cacheable: true } : null;
  }
  if (principal.kind !== "user") return null;
  if (kind === "vocabulary" || kind === "pronunciation") {
    const word = await ownedWord(kind === "vocabulary" ? "vocabulary_session_items" : "pronunciation_session_items", principal.userId, sessionId, itemId);
    return word ? { ...wordSpeech(word), cacheable: true } : null;
  }
  const session = await conversationStore.load(principal.userId, sessionId).catch(() => null);
  const message = session?.messages.find(entry => entry.id === itemId && entry.role === "assistant");
  if (!session || !message) return null;
  // Only the scenario's fixed opening line is shared; AI replies are per learner and never cached.
  const opening = findConversationScenario(session.scenario.key)?.opening;
  return { ...rolePlaySpeech(message.content, session.scenario.aiRole), cacheable: message.content === opening };
}
