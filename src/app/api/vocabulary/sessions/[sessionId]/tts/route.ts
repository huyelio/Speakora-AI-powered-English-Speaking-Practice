import { NextResponse } from "next/server";
import {
  OpenAIProvider,
  VOCABULARY_TTS_INSTRUCTIONS,
} from "../../../../../../modules/ai-gateway/openai";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { getVocabularySessionItemSnapshot } from "../../../../../../modules/vocabulary/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)
      || typeof body.sessionItemId !== "string"
      || !UUID_PATTERN.test(body.sessionItemId)) {
      return NextResponse.json({ error: "Mục từ chưa hợp lệ." }, { status: 400 });
    }

    const snapshot = await getVocabularySessionItemSnapshot(
      sessionId,
      principal.userId,
      body.sessionItemId,
    );
    if (!snapshot) {
      return NextResponse.json({ error: "Không tìm thấy mục từ trong phiên." }, { status: 404 });
    }

    const word = snapshot.word.trim();
    const audio = await new OpenAIProvider().synthesize(`${word}.`, {
      instructions: VOCABULARY_TTS_INSTRUCTIONS,
      speed: Number(process.env.OPENAI_VOCAB_TTS_SPEED || "0.9"),
      voice: process.env.OPENAI_VOCAB_TTS_VOICE || process.env.OPENAI_TTS_VOICE || "coral",
    });
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Vocabulary TTS failed", error);
    return NextResponse.json({ error: "Không thể tạo audio phát âm." }, { status: 500 });
  }
}
