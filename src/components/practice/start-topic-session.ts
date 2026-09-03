import type { LearnerLevel } from "../../modules/profile/types";

export async function createTopicPracticeSession(
  fetcher: typeof fetch,
  topicId: string,
  difficulty: LearnerLevel,
): Promise<string> {
  const response = await fetcher("/api/practice/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "GENERAL",
      topicId,
      difficulty,
      questionCount: 5,
    }),
  });
  const body = await response.json().catch(() => null) as {
    error?: unknown;
    sessionId?: unknown;
  } | null;
  if (!response.ok) {
    throw new Error(typeof body?.error === "string"
      ? body.error
      : "Không thể tạo phiên luyện. Vui lòng thử lại.");
  }
  if (typeof body?.sessionId !== "string" || body.sessionId.length === 0) {
    throw new Error("Phản hồi tạo phiên luyện không hợp lệ.");
  }
  return `/practice/${encodeURIComponent(body.sessionId)}`;
}
