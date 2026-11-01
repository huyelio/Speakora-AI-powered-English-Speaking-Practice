import type { LearnerLevel } from "../../modules/profile/types";
import { browserT } from "../../i18n/translate";

export async function createVocabularyPracticeSession(
  fetchImpl: typeof fetch,
  topicId: string,
  level: LearnerLevel,
  itemCount = 10,
): Promise<string> {
  const response = await fetchImpl("/api/vocabulary/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId, level, itemCount }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : browserT()("Không thể tạo phiên luyện từ vựng."));
  }
  if (typeof body.sessionId !== "string") {
    throw new Error(browserT()("Phản hồi tạo phiên không hợp lệ."));
  }
  return `/vocabulary/${body.sessionId}`;
}
