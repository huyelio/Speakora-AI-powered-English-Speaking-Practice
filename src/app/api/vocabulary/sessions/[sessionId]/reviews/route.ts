import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../../../modules/practice/auth";
import { saveVocabularyReview } from "../../../../../../modules/vocabulary/repository";
import type { VocabularyReviewResult } from "../../../../../../modules/vocabulary/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReviewResult(value: unknown): value is VocabularyReviewResult {
  return value === "REMEMBERED" || value === "NOT_REMEMBERED";
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
      || !UUID_PATTERN.test(body.sessionItemId)
      || !isReviewResult(body.result)) {
      return NextResponse.json({ error: "Kết quả ôn tập chưa hợp lệ." }, { status: 400 });
    }

    const session = await saveVocabularyReview(
      sessionId,
      principal.userId,
      body.sessionItemId,
      body.result,
    );
    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Không tìm thấy mục từ trong phiên." }, { status: 404 });
    }
    console.error("Save vocabulary review failed", error);
    return NextResponse.json({ error: "Không thể lưu kết quả ôn tập." }, { status: 500 });
  }
}
