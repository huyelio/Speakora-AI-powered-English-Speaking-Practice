import { NextResponse } from "next/server";
import { OpenAIProvider } from "../../../../modules/ai-gateway/openai";
import { resolveSessionPrincipal } from "../../../../modules/practice/auth";
import { authorizeSession, questionBelongsToSession } from "../../../../modules/practice/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isTtsBody(body)) {
      return NextResponse.json({ error: "Session and question are required." }, { status: 400 });
    }
    const principal = await resolveSessionPrincipal(request);
    if (!principal || !await authorizeSession(body.sessionId, principal)) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    const question = await questionBelongsToSession(body.sessionId, body.sessionQuestionId);
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    const snapshot = question.prompt_snapshot as Record<string, unknown>;
    if (typeof snapshot.prompt_text !== "string") throw new Error("Question prompt is unavailable.");
    const audio = await new OpenAIProvider().synthesize(snapshot.prompt_text);
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    console.error("TTS failed", error);
    return NextResponse.json({ error: "Unable to synthesize question." }, { status: 500 });
  }
}

function isTtsBody(value: unknown): value is { sessionId: string; sessionQuestionId: string } {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.sessionId === "string" && item.sessionId.length > 0
    && typeof item.sessionQuestionId === "string" && item.sessionQuestionId.length > 0;
}
