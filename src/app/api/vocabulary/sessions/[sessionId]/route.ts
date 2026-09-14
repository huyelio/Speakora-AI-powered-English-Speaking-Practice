import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../modules/practice/auth";
import { getClientVocabularySession } from "../../../../../modules/vocabulary/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }

    const session = await getClientVocabularySession(sessionId, principal.userId);
    if (!session) {
      return NextResponse.json({ error: "Không tìm thấy phiên luyện từ vựng." }, { status: 404 });
    }

    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Get vocabulary session failed", error);
    return NextResponse.json({ error: "Không thể tải phiên luyện từ vựng." }, { status: 500 });
  }
}
