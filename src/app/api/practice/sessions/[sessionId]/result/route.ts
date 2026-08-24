import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import {
  authorizeSession,
  getAnswerReview,
  getAssessment,
  getSessionStatus,
} from "../../../../../../modules/practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolveSessionPrincipal(request);
    const session = principal ? await authorizeSession(sessionId, principal) : null;
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const result = await getAssessment(sessionId, session.mode);
    if (!result) {
      return NextResponse.json(
        { status: await getSessionStatus(sessionId) },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { sessionId, result, answers: await getAnswerReview(sessionId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Result failed", error);
    return NextResponse.json({ error: "Unable to load result." }, { status: 500 });
  }
}
