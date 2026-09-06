import type {
  ClientPracticeSession,
  PracticeMode,
  SessionQuestion,
} from "../../modules/practice/types";

export type PracticeStage = "setup" | "practice" | "processing" | "result";

type LegacyGuestSession = {
  sessionId: string;
  token: string;
  questions: SessionQuestion[];
  index: number;
};

export function authHeadersFor(
  principalKind: "user" | "guest",
  sessionToken: string | undefined,
): { Authorization: string } | undefined {
  return principalKind === "guest" && sessionToken
    ? { Authorization: `Bearer ${sessionToken}` }
    : undefined;
}

export function recoverGuestSession(raw: string): ClientPracticeSession | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (isLegacyGuestSession(value)) {
      return {
        sessionId: value.sessionId,
        sessionToken: value.token,
        mode: "IELTS",
        status: "IN_PROGRESS",
        questions: value.questions,
        currentQuestionIndex: value.index,
        topic: null,
      };
    }
    if (!isClientGuestSession(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function stageForSession(session: ClientPracticeSession | null): PracticeStage {
  if (!session) return "setup";
  return session.currentQuestionIndex >= session.questions.length || session.status !== "IN_PROGRESS"
    ? "processing"
    : "practice";
}

export class AsyncRequestEpoch {
  private generation = 0;

  begin(): number {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }

  invalidate(): void {
    this.generation += 1;
  }
}

export function retainObjectUrlIfCurrent(
  epoch: AsyncRequestEpoch,
  token: number,
  url: string,
): boolean {
  if (epoch.isCurrent(token)) return true;
  URL.revokeObjectURL(url);
  return false;
}

export function nextQuestionIndexFromUpload(value: unknown, questionCount: number): number {
  if (
    !isRecord(value)
    || !Number.isInteger(value.nextQuestionIndex)
    || Number(value.nextQuestionIndex) < 0
    || Number(value.nextQuestionIndex) > questionCount
  ) {
    throw new Error("Phản hồi gửi câu trả lời không hợp lệ.");
  }
  return Number(value.nextQuestionIndex);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuestionArray(value: unknown): value is SessionQuestion[] {
  return Array.isArray(value) && value.every((question) => (
    isRecord(question)
    && typeof question.sessionQuestionId === "string"
    && typeof question.promptText === "string"
    && typeof question.sequenceNo === "number"
  ));
}

function isLegacyGuestSession(value: Record<string, unknown>): value is LegacyGuestSession {
  return typeof value.sessionId === "string"
    && typeof value.token === "string"
    && isQuestionArray(value.questions)
    && Number.isInteger(value.index)
    && Number(value.index) >= 0;
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "IELTS" || value === "GENERAL";
}

function isClientGuestSession(value: Record<string, unknown>): value is ClientPracticeSession {
  return typeof value.sessionId === "string"
    && typeof value.sessionToken === "string"
    && isPracticeMode(value.mode)
    && typeof value.status === "string"
    && isQuestionArray(value.questions)
    && Number.isInteger(value.currentQuestionIndex)
    && Number(value.currentQuestionIndex) >= 0
    && (value.topic === null || (
      isRecord(value.topic)
      && typeof value.topic.slug === "string"
      && typeof value.topic.name === "string"
    ));
}
