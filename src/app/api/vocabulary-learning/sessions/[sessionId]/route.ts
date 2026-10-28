import { learningRequest, uuid } from "../../../../../modules/vocabulary-learning/http";
import { LearningError } from "../../../../../modules/vocabulary-learning/errors";
import { getLearningSession } from "../../../../../modules/vocabulary-learning/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return learningRequest(request, async userId => {
    const { sessionId } = await params;
    if (!uuid(sessionId)) throw new LearningError("INVALID_INPUT", "Mã phiên chưa hợp lệ.");
    const session = await getLearningSession(sessionId, userId);
    if (!session) throw new LearningError("SESSION_NOT_FOUND", "Không tìm thấy phiên học.", 404);
    return session;
  });
}
