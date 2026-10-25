import { randomUUID } from "node:crypto";
import type { SpeechToTextProvider } from "../ai-gateway/openai";
import type { ConversationProvider } from "../ai-gateway/conversation";
import { mergeGoals, parseConversationReply, type ConversationMessage, type ConversationSession, type GoalId } from "./scenario";

export type StoredTurn = ConversationMessage & { audio_path: string | null };
export type TurnAction = "AUDIO" | "TRANSCRIPT" | "REPLY" | "RELEASE";
export type TurnUpdate = { content?: string; audioPath?: string; goals?: GoalId[] };
export interface ConversationStore {
  load(userId: string, sessionId: string): Promise<ConversationSession>;
  claim(userId: string, sessionId: string, messageId: string, token: string): Promise<StoredTurn>;
  advance(userId: string, sessionId: string, token: string, action: TurnAction, update?: TurnUpdate): Promise<void>;
  upload(userId: string, sessionId: string, messageId: string, token: string, file: File): Promise<string>;
  download(path: string): Promise<Blob>;
}

export async function transcribeTurn(db: ConversationStore, provider: SpeechToTextProvider,
  userId: string, sessionId: string, messageId: string, input: { audio?: File; text?: string; replaceAudio?: boolean }) {
  const token = randomUUID();
  const message = await db.claim(userId, sessionId, messageId, token);
  if (message.processing_status === "COMPLETED") return db.load(userId, sessionId);
  try {
    if (message.processing_status === "TRANSCRIBED") {
      await db.advance(userId, sessionId, token, "RELEASE");
      return await db.load(userId, sessionId);
    }
    let text = input.text?.trim();
    if (!text) {
      let path = message.audio_path;
      if (!path || (input.audio && input.replaceAudio)) {
        if (!input.audio) throw new Error("Hãy ghi âm lại hoặc nhập lời thoại để tiếp tục.");
        path = await db.upload(userId, sessionId, messageId, token, input.audio);
      }
      const audio = await db.download(path);
      text = (await provider.transcribe(audio, path.split("/").pop() || "answer.webm")).trim();
    }
    if (!text) throw new Error("Không nhận diện được lời nói. Hãy thử ghi âm lại.");
    if (text.length > 4000) throw new Error("Lời thoại quá dài. Hãy nói ngắn hơn.");
    await db.advance(userId, sessionId, token, "TRANSCRIPT", { content: text });
    return await db.load(userId, sessionId);
  } catch (error) {
    await db.advance(userId, sessionId, token, "RELEASE").catch(() => {});
    throw error;
  }
}

export async function replyToTurn(db: ConversationStore, provider: ConversationProvider,
  userId: string, sessionId: string, messageId: string) {
  const token = randomUUID();
  const message = await db.claim(userId, sessionId, messageId, token);
  if (message.processing_status === "COMPLETED") return db.load(userId, sessionId);
  try {
    if (message.processing_status !== "TRANSCRIBED") throw new Error("Hãy nhận diện bản ghi âm trước.");
    const session = await db.load(userId, sessionId);
    // Entire prototype history, capped at 40 learner turns by the API.
    const history = session.messages.filter((item) => item.content.trim()).map(({ role, content }) => ({ role, content }));
    const result = parseConversationReply(await provider.reply(history, session.completed_goals, session.scenario), session.scenario);
    await db.advance(userId, sessionId, token, "REPLY", {
      content: result.reply, goals: mergeGoals(session.completed_goals, result.completedGoals),
    });
    return await db.load(userId, sessionId);
  } catch (error) {
    await db.advance(userId, sessionId, token, "RELEASE").catch(() => {});
    throw error;
  }
}
