import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../../../lib/supabase/server";
import { AudioAccessError, resolveAuthorizedAudio } from "../../../../../../../../modules/practice/audio-access";
import { resolveSessionPrincipal } from "../../../../../../../../modules/practice/auth";
import { authorizeSession, findAnswerAudio } from "../../../../../../../../modules/practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; answerId: string }> },
) {
  try {
    const { sessionId, answerId } = await params;
    const principal = await resolveSessionPrincipal(request);
    if (!principal) throw new AudioAccessError(404, "Audio not found.");
    const audio = await resolveAuthorizedAudio(
      { sessionId, answerId, principal },
      { authorizeSession, findAnswerAudio },
    );
    const { data, error } = await getSupabaseAdminClient().storage.from(audio.bucket).download(audio.path);
    if (error || !data) throw new AudioAccessError(404, "Audio not found.");
    return new Response(data, {
      headers: {
        "Content-Type": audio.mimeType,
        "Content-Length": String(data.size),
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (error instanceof AudioAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Audio playback failed", error);
    return NextResponse.json({ error: "Unable to load audio." }, { status: 500 });
  }
}
