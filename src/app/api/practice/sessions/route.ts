import { NextResponse } from "next/server";
import { createGuestCredentials, resolveSessionPrincipal } from "../../../../modules/practice/auth";
import {
  DEFAULT_PRACTICE_QUESTION_COUNT,
  IELTS_PRACTICE_QUESTION_COUNT,
  isValidPracticeQuestionCount,
} from "../../../../modules/practice/constants";
import {
  createGeneralPracticeSession,
  createPracticeSession,
  InsufficientTopicQuestionsError,
} from "../../../../modules/practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GeneralSessionBody = {
  mode?: "GENERAL";
  topicId: string;
  questionCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readQuestionCount(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_PRACTICE_QUESTION_COUNT;
  return typeof value === "number" ? value : Number.NaN;
}

function readGeneralBody(value: unknown): GeneralSessionBody | null {
  if (!isRecord(value)) return null;
  const hasGeneralMode = value.mode === undefined || value.mode === "GENERAL";
  if (!hasGeneralMode) return null;
  if (typeof value.topicId !== "string" || !UUID_PATTERN.test(value.topicId)) return null;

  const questionCount = readQuestionCount(value.questionCount);
  if (!isValidPracticeQuestionCount(questionCount)) return null;

  return { mode: "GENERAL", topicId: value.topicId, questionCount };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);

    if (isRecord(body) && body.mode === "IELTS") {
      if (body.questionCount !== IELTS_PRACTICE_QUESTION_COUNT) {
        return NextResponse.json(
          { error: "Phiên IELTS phải có 5 câu hỏi." },
          { status: 400 },
        );
      }
      const credentials = createGuestCredentials();
      const result = await createPracticeSession(credentials.hash);
      return NextResponse.json(
        {
          ...result,
          mode: "IELTS",
          sessionToken: credentials.token,
          status: "IN_PROGRESS",
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    const generalBody = readGeneralBody(body);
    if (!generalBody) {
      return NextResponse.json(
        { error: "Thông tin chủ đề hoặc số câu hỏi chưa hợp lệ." },
        { status: 400 },
      );
    }

    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
    }

    const result = await createGeneralPracticeSession(
      principal.userId,
      generalBody.topicId,
      generalBody.questionCount,
    );
    return NextResponse.json(
      { ...result, mode: "GENERAL", status: "IN_PROGRESS" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof InsufficientTopicQuestionsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create session failed", error);
    return NextResponse.json({ error: "Không thể tạo phiên luyện tập." }, { status: 500 });
  }
}
