import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../../../../modules/practice/auth";
import {
  DEFAULT_VOCABULARY_ITEM_COUNT,
  isValidVocabularyItemCount,
} from "../../../../modules/vocabulary/constants";
import {
  createVocabularySession,
  InsufficientVocabularyItemsError,
} from "../../../../modules/vocabulary/repository";
import { isLearnerLevel } from "../../../../modules/vocabulary/selection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readItemCount(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_VOCABULARY_ITEM_COUNT;
  return typeof value === "number" ? value : Number.NaN;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Thông tin phiên từ vựng chưa hợp lệ." }, { status: 400 });
    }
    if (typeof body.topicId !== "string" || !UUID_PATTERN.test(body.topicId)) {
      return NextResponse.json({ error: "Chủ đề chưa hợp lệ." }, { status: 400 });
    }
    if (!isLearnerLevel(body.level)) {
      return NextResponse.json({ error: "Trình độ chưa hợp lệ." }, { status: 400 });
    }
    const itemCount = readItemCount(body.itemCount);
    if (!isValidVocabularyItemCount(itemCount)) {
      return NextResponse.json({ error: "Số từ luyện phải từ 1 đến 20." }, { status: 400 });
    }

    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }

    const result = await createVocabularySession(
      principal.userId,
      body.topicId,
      body.level,
      itemCount,
    );
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InsufficientVocabularyItemsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create vocabulary session failed", error);
    return NextResponse.json({ error: "Không thể tạo phiên luyện từ vựng." }, { status: 500 });
  }
}
