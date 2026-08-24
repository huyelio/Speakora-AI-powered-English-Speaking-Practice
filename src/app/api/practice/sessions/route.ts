import { NextResponse } from "next/server";
import { createGuestCredentials, resolveSessionPrincipal } from "../../../../modules/practice/auth";
import { learnerLevels, type LearnerLevel } from "../../../../modules/profile/types";
import {
  createGeneralPracticeSession,
  createPracticeSession,
} from "../../../../modules/practice/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeneralSessionBody = {
  mode: "GENERAL";
  topicId: string;
  difficulty: LearnerLevel;
  questionCount: 5;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readGeneralBody(value: unknown): GeneralSessionBody | null {
  if (!isRecord(value) || value.mode !== "GENERAL" || value.questionCount !== 5) return null;
  if (typeof value.topicId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.topicId)) return null;
  if (typeof value.difficulty !== "string" || !learnerLevels.includes(value.difficulty as LearnerLevel)) return null;
  return value as GeneralSessionBody;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);

    if (isRecord(body) && body.mode === "IELTS") {
      if (body.questionCount !== 5) {
        return NextResponse.json(
          { error: "IELTS questionCount must be 5." },
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
        { error: "General practice requires a topicId, supported difficulty, and questionCount 5." },
        { status: 400 },
      );
    }

    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const result = await createGeneralPracticeSession(
      principal.userId,
      generalBody.topicId,
      generalBody.difficulty,
    );
    return NextResponse.json(
      { ...result, mode: "GENERAL", status: "IN_PROGRESS" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Create session failed", error);
    return NextResponse.json({ error: "Unable to create practice session." }, { status: 500 });
  }
}
