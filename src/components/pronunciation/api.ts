import type { LearnerLevel } from "../../modules/profile/types";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";

export class PronunciationApiError extends Error {
  constructor(message: string, readonly status: number, readonly attemptId?: string, readonly attemptStatus?: string) {
    super(message);
    this.name = "PronunciationApiError";
  }
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

export async function responseError(response: Response): Promise<PronunciationApiError> {
  const body = await jsonBody(response);
  return new PronunciationApiError(typeof body.error === "string" ? body.error : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.", response.status,
    typeof body.attemptId === "string" ? body.attemptId : undefined,
    typeof body.status === "string" ? body.status : undefined);
}

type StartInput = { topicId: string; level: LearnerLevel; itemCount?: number } | { selection: "WEAK"; sourceSessionId: string };
export async function createPronunciationPracticeSession(fetchImpl: typeof fetch, input: StartInput): Promise<string> {
  const payload = "selection" in input ? input : { ...input, itemCount: input.itemCount ?? 10 };
  const response = await fetchImpl("/api/pronunciation/sessions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  const body = await jsonBody(response);
  if (typeof body.sessionId !== "string" || !body.sessionId) throw new PronunciationApiError("Phản hồi tạo phiên không hợp lệ.", response.status);
  return `/pronunciation/${encodeURIComponent(body.sessionId)}`;
}

export async function readAttemptResponse(response: Response): Promise<string> {
  if (!response.ok) throw await responseError(response);
  const body = await jsonBody(response);
  if (typeof body.attemptId !== "string") throw new PronunciationApiError("Phản hồi chấm điểm không hợp lệ.", response.status);
  if (body.status !== "COMPLETED") {
    throw new PronunciationApiError(body.status === "FAILED"
      ? "Chưa thể chấm điểm. Bạn có thể chấm lại bản ghi đã lưu."
      : "Bản ghi đang được xử lý. Kiểm tra kết quả hoặc thử chấm lại sau 5 phút.", response.status, body.attemptId, String(body.status));
  }
  return body.attemptId;
}

export async function loadPronunciationSession(sessionId: string, signal?: AbortSignal): Promise<ClientPronunciationSession> {
  const response = await fetch(`/api/pronunciation/sessions/${sessionId}`, { cache: "no-store", signal });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<ClientPronunciationSession>;
}
