import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../modules/practice/auth";
import {
  createPronunciationSession,
  createWeakPronunciationSession,
  DEFAULT_PRONUNCIATION_ITEM_COUNT,
  InsufficientPronunciationItemsError,
  NoWeakPronunciationItemsError,
} from "../../../../modules/pronunciation-practice/repository";
import { isLearnerLevel } from "../../../../modules/vocabulary/selection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Thông tin phiên luyện phát âm chưa hợp lệ." }, { status: 400 });
    }

    let session;
    if (body.selection === "WEAK") {
      if (typeof body.sourceSessionId !== "string" || !UUID_PATTERN.test(body.sourceSessionId)) {
        return NextResponse.json({ error: "Phiên nguồn chưa hợp lệ." }, { status: 400 });
      }
      session = await createWeakPronunciationSession(principal.userId, body.sourceSessionId);
    } else {
      if (typeof body.topicId !== "string" || !UUID_PATTERN.test(body.topicId)) {
        return NextResponse.json({ error: "Chủ đề chưa hợp lệ." }, { status: 400 });
      }
      if (!isLearnerLevel(body.level)) {
        return NextResponse.json({ error: "Trình độ chưa hợp lệ." }, { status: 400 });
      }
      const itemCount = body.itemCount === undefined ? DEFAULT_PRONUNCIATION_ITEM_COUNT : body.itemCount;
      if (!Number.isInteger(itemCount) || (itemCount as number) < 1 || (itemCount as number) > 20) {
        return NextResponse.json({ error: "Số từ luyện phải từ 1 đến 20." }, { status: 400 });
      }
      session = await createPronunciationSession(
        principal.userId,
        body.topicId,
        body.level,
        itemCount as number,
      );
    }

    return NextResponse.json(session, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InsufficientPronunciationItemsError || error instanceof NoWeakPronunciationItemsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create pronunciation session failed");
    return NextResponse.json({ error: "Không thể tạo phiên luyện phát âm." }, { status: 500 });
  }
}
