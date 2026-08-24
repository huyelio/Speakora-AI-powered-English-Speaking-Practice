import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { authorizeSession } from "../../../../../../modules/practice/repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolveSessionPrincipal(request);
    if (!principal || !await authorizeSession(sessionId, principal)) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { data, error } = await getSupabaseAdminClient().rpc(
      "retry_failed_processing_jobs",
      { p_session_id: sessionId },
    );
    if (error) throw error;
    if (typeof data !== "number" || !Number.isInteger(data) || data < 0) {
      throw new Error("Invalid retry response.");
    }
    return NextResponse.json({ retried: data });
  } catch (error) {
    console.error("Retry failed", error);
    return NextResponse.json({ error: "Unable to retry processing." }, { status: 500 });
  }
}
