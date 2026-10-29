import { randomUUID } from "node:crypto";
import type { SpeechToTextProvider } from "../ai-gateway/openai";
import type { ConversationProvider } from "../ai-gateway/conversation";
import { MIN_ASSESSED_TURNS, parseConversationAssessment, type ConversationAssessment } from "./assessment";
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
  /** Saves the first assessment of an ended session and grants its rewards; replays keep the stored one. */
  saveAssessment(userId: string, sessionId: string, assessment: ConversationAssessment): Promise<void>;
}
export interface ConversationAssessmentProvider {
  assess(history: Pick<ConversationMessage, "role" | "content">[], scenario: ConversationSession["scenario"]): Promise<unknown>;
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
      let audio: Blob | undefined;
      if (!path || (input.audio && input.replaceAudio)) {
        if (!input.audio) throw new Error("Hãy ghi âm lại hoặc nhập lời thoại để tiếp tục.");
        path = await db.upload(userId, sessionId, messageId, token, input.audio);
        // Just stored: transcribe the bytes in hand instead of reading them back.
        audio = input.audio;
      }
      audio ??= await db.download(path);
      // The AI line being answered helps STT read short, accented replies.
      const session = await db.load(userId, sessionId);
      const context = session.messages.filter((item) => item.role === "assistant" && item.turn_index < message.turn_index && item.content).at(-1)?.content;
      text = (await provider.transcribe(audio, path.split("/").pop() || "answer.webm", { context })).trim();
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

/**
 * Feedback for an ended session, at most one model call per attempt. Sessions that are still running,
 * too short or already assessed come back unchanged. Quotes must come from the learner's own turns;
 * one retry covers an output that fails that check.
 */
export async function assessConversation(db: ConversationStore, provider: ConversationAssessmentProvider,
  userId: string, sessionId: string) {
  const session = await db.load(userId, sessionId);
  if (session.status !== "COMPLETED" || session.assessment || session.user_turn_count < MIN_ASSESSED_TURNS) return session;
  const history = session.messages.filter((item) => item.content.trim()).map(({ role, content }) => ({ role, content }));
  const learnerTurns = history.filter((item) => item.role === "user").map((item) => item.content);
  let assessment: ConversationAssessment;
  try {
    assessment = parseConversationAssessment(await provider.assess(history, session.scenario), learnerTurns);
  } catch {
    assessment = parseConversationAssessment(await provider.assess(history, session.scenario), learnerTurns);
  }
  await db.saveAssessment(userId, sessionId, assessment);
  return db.load(userId, sessionId);
}
