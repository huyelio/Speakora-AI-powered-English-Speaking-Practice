import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { validateAudio } from "../audio/validation";
import { airplaneScenario, findConversationScenario, parseScenarioSnapshot, type ConversationSession } from "./scenario";
import type { ConversationStore, StoredTurn, TurnAction, TurnUpdate } from "./service";

export class ConversationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
function dbError(error: { message: string; code?: string }): never {
  if (error.message.includes("NOT_FOUND")) throw new ConversationError("Không tìm thấy hội thoại.", 404);
  if (error.message.includes("TURN_BUSY")) throw new ConversationError("Lượt này đang được xử lý. Hãy kiểm tra lại sau vài giây.", 409);
  if (error.message.includes("PENDING_TURN")) throw new ConversationError("Hãy thử lại lượt đang chờ trước khi gửi lượt mới.", 409);
  if (error.message.includes("SESSION_ENDED")) throw new ConversationError("Hội thoại đã kết thúc.", 409);
  if (error.message.includes("TURN_LIMIT")) throw new ConversationError("Đã đạt giới hạn 40 lượt của bản thử nghiệm. Hãy kết thúc và bắt đầu phiên mới.", 409);
  if (error.code === "PGRST205" || error.code === "PGRST202" || error.code === "42P01") {
    throw new ConversationError("AI Role-play chưa sẵn sàng. Cần áp dụng migration 202610040001_ai_conversation.sql.", 503);
  }
  throw new ConversationError("Không thể lưu hội thoại. Hãy thử lại.", 500);
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdminClient().rpc(name, args);
  if (error) dbError(error);
  return data;
}

export const conversationStore: ConversationStore = {
  async load(userId, sessionId) {
    const db = getSupabaseAdminClient();
    const { data, error } = await db.from("conversation_sessions")
      .select("id,status,user_turn_count,completed_goals,pending_message_id,processing_until,scenario_key,scenario_snapshot")
      .eq("id", sessionId).eq("user_id", userId).maybeSingle();
    if (error) dbError(error);
    if (!data) throw new ConversationError("Không tìm thấy hội thoại.", 404);
    const messages = await db.from("conversation_messages")
      .select("id,role,content,turn_index,processing_status,completed_goals").eq("session_id", sessionId).order("turn_index");
    if (messages.error) dbError(messages.error);
    const scenario = parseScenarioSnapshot(data.scenario_snapshot);
    if (scenario.key !== data.scenario_key) throw new ConversationError("Dữ liệu tình huống không hợp lệ.", 500);
    return { ...data, scenario, messages: messages.data ?? [] } as ConversationSession;
  },
  async claim(userId, sessionId, messageId, token) {
    return await rpc("claim_conversation_turn", { p_session_id: sessionId, p_user_id: userId, p_message_id: messageId, p_token: token }) as StoredTurn;
  },
  async advance(userId: string, sessionId: string, token: string, action: TurnAction, update: TurnUpdate = {}) {
    await rpc("advance_conversation_turn", { p_session_id: sessionId, p_user_id: userId, p_token: token, p_action: action,
      p_content: update.content ?? null, p_audio_path: update.audioPath ?? null, p_goals: update.goals ?? [],
    });
  },
  async upload(userId, sessionId, messageId, token, file) {
    const extension = validateAudio(file);
    const path = `conversation/${userId}/${sessionId}/${messageId}/${token}.${extension}`;
    const db = getSupabaseAdminClient();
    const { error } = await db.storage.from("speaking-answers").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new ConversationError("Không thể lưu bản ghi âm. Hãy thử lại.", 502);
    try {
      await this.advance(userId, sessionId, token, "AUDIO", { audioPath: path });
    } catch (error) {
      await db.storage.from("speaking-answers").remove([path]);
      throw error;
    }
    return path;
  },
  async download(path) {
    const { data, error } = await getSupabaseAdminClient().storage.from("speaking-answers").download(path);
    if (error || !data) throw new ConversationError("Không thể đọc bản ghi âm. Hãy thử lại.", 502);
    return data;
  },
};

export async function createConversation(userId: string, id: string, scenarioKey = airplaneScenario.key) {
  const scenario = findConversationScenario(scenarioKey);
  if (!scenario) throw new ConversationError("Không tìm thấy tình huống.", 400);
  await rpc("create_conversation_session", { p_id: id, p_user_id: userId, p_snapshot: scenario });
  return conversationStore.load(userId, id);
}
export async function endConversation(userId: string, sessionId: string) {
  await rpc("end_conversation_session", { p_session_id: sessionId, p_user_id: userId });
  return conversationStore.load(userId, sessionId);
}
