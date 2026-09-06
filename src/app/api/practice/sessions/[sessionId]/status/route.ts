import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { authorizeSession, getSessionStatus } from "../../../../../../modules/practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolveSessionPrincipal(request);
    if (!principal || !await authorizeSession(sessionId, principal)) {
      return NextResponse.json({ error: "Không tìm thấy phiên luyện tập." }, { status: 404 });
    }
    return NextResponse.json(await getSessionStatus(sessionId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Status failed", error);
    return NextResponse.json({ error: "Không thể tải trạng thái phiên." }, { status: 500 });
  }
}
