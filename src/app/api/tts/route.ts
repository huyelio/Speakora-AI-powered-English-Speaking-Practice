import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase/server";
import { OpenAIProvider, SpeechTimeoutError, streamSpeech } from "../../../modules/ai-gateway/openai";
import { resolveSessionPrincipal } from "../../../modules/practice/auth";
import { cachedSpeech, supabaseTtsStorage } from "../../../modules/tts/cache";
import { resolveSpeech, ttsKinds, type TtsKind } from "../../../modules/tts/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Fixed bank audio never changes for a given session item, so the browser may keep it. */
const FIXED_CACHE_CONTROL = "private, max-age=604800, immutable";

/**
 * Single TTS endpoint for every mode: `GET /api/tts?kind=&session=&item=`.
 * GET so the browser can cache fixed audio; per-learner AI text streams with `no-store`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as TtsKind | null;
  const sessionId = url.searchParams.get("session") ?? "";
  const itemId = url.searchParams.get("item") ?? "";
  if (!kind || !ttsKinds.includes(kind) || !UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(itemId)) {
    return NextResponse.json({ error: "Yêu cầu âm thanh chưa hợp lệ." }, { status: 400 });
  }
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    const speech = await resolveSpeech(kind, principal, sessionId, itemId);
    if (!speech) return NextResponse.json({ error: "Không tìm thấy nội dung cần đọc." }, { status: 404 });

    if (speech.cacheable) {
      const provider = new OpenAIProvider();
      const { audio, hit } = await cachedSpeech(supabaseTtsStorage(getSupabaseAdminClient()), (text, options) => provider.synthesize(text, options), speech);
      return new NextResponse(audio, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": FIXED_CACHE_CONTROL, "X-TTS-Cache": hit ? "hit" : "miss" },
      });
    }
    return new NextResponse(await streamSpeech(speech.text, speech.options), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SpeechTimeoutError) {
      return NextResponse.json({ error: "Âm thanh đang tạo quá lâu. Hãy bấm Thử nghe lại." }, { status: 504 });
    }
    console.error("TTS failed");
    return NextResponse.json({ error: "Không thể tạo âm thanh. Hãy bấm Thử nghe lại." }, { status: 500 });
  }
}
