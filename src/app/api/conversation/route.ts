import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { OpenAIProvider } from "../../../modules/ai-gateway/openai";
import { OpenAIConversationProvider } from "../../../modules/ai-gateway/conversation";
import { validateAudio } from "../../../modules/audio/validation";
import { ConversationError, conversationStore, createConversation, endConversation } from "../../../modules/conversation/repository";
import { assessConversation, transcribeTurn, replyToTurn } from "../../../modules/conversation/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new ConversationError("Thông tin hội thoại không hợp lệ.", 400);
  return value;
}
function json(value: unknown) { return NextResponse.json(value, { headers: { "Cache-Control": "no-store" } }); }
function failure(error: unknown) {
  if (error instanceof ConversationError) return NextResponse.json({ error: error.message }, { status: error.status });
  // Never expose provider messages or credentials to the browser/log.
  return NextResponse.json({ error: "Không thể xử lý lời thoại. Hãy thử lại; lượt đã lưu sẽ được giữ." }, { status: 502 });
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) throw new ConversationError("Bạn cần đăng nhập để tiếp tục.", 401);
    return json(await conversationStore.load(user.id, id(new URL(request.url).searchParams.get("sessionId"))));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) throw new ConversationError("Bạn cần đăng nhập để tiếp tục.", 401);
    let body: Record<string, unknown>;
    let audio: File | undefined;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      body = { action: "transcribe", sessionId: form.get("sessionId"), messageId: form.get("messageId"), replaceAudio: form.get("replaceAudio") === "true" };
      const file = form.get("audio");
      if (file instanceof File) {
        try { validateAudio(file); } catch (error) { throw new ConversationError((error as Error).message, 400); }
        audio = file;
      }
    } else {
      const value: unknown = await request.json().catch(() => null);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConversationError("Yêu cầu không hợp lệ.", 400);
      body = value as Record<string, unknown>;
    }
    const sessionId = id(body.sessionId);
    switch (body.action) {
      case "create": {
        if (body.scenarioKey !== undefined && typeof body.scenarioKey !== "string") throw new ConversationError("Tình huống không hợp lệ.", 400);
        return json(await createConversation(user.id, sessionId, body.scenarioKey as string | undefined));
      }
      case "end": return json(await endConversation(user.id, sessionId));
      case "assess": return json(await assessConversation(conversationStore, new OpenAIConversationProvider(), user.id, sessionId));
      case "transcribe": {
        if (body.text !== undefined && (typeof body.text !== "string" || !body.text.trim() || body.text.length > 4000)) {
          throw new ConversationError("Lời thoại cần có từ 1 đến 4000 ký tự.", 400);
        }
        return json(await transcribeTurn(conversationStore, new OpenAIProvider(), user.id, sessionId, id(body.messageId),
          { audio, text: body.text as string | undefined, replaceAudio: body.replaceAudio === true }));
      }
      case "reply": return json(await replyToTurn(conversationStore, new OpenAIConversationProvider(), user.id, sessionId, id(body.messageId)));
      default: throw new ConversationError("Thao tác không hợp lệ.", 400);
    }
  } catch (error) { return failure(error); }
}
