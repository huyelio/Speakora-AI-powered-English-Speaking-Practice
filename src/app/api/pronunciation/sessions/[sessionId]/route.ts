import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../modules/practice/auth";
import { getClientPronunciationSession } from "../../../../../modules/pronunciation-practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }
    const { sessionId } = await params;
    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: "Phiên luyện phát âm chưa hợp lệ." }, { status: 400 });
    }
    const session = await getClientPronunciationSession(sessionId, principal.userId);
    if (!session) {
      return NextResponse.json({ error: "Không tìm thấy phiên luyện phát âm." }, { status: 404 });
    }
    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Get pronunciation session failed");
    return NextResponse.json({ error: "Không thể tải phiên luyện phát âm." }, { status: 500 });
  }
}
