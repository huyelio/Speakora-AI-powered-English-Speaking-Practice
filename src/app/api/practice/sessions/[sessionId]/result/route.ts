import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import {
  authorizeSession,
  getAnswerReview,
  getAssessment,
  getGeneralResultExperience,
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
      return NextResponse.json({ error: "Không tìm thấy phiên luyện tập." }, { status: 404 });
    }

    const result = await getAssessment(sessionId, session.mode);
    if (!result) {
      return NextResponse.json(
        { status: await getSessionStatus(sessionId) },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    const experience = result.mode === "GENERAL"
      ? await getGeneralResultExperience(session, result)
      : undefined;
    return NextResponse.json(
      {
        sessionId,
        result,
        answers: await getAnswerReview(sessionId),
        ...(experience ? { experience } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Result failed", error);
    return NextResponse.json({ error: "Không thể tải kết quả." }, { status: 500 });
  }
}
