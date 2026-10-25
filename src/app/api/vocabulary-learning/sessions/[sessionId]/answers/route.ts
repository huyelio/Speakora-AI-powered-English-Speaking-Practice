import { learningRequest, readMutationInput, uuid } from "../../../../../../modules/vocabulary-learning/http";
import { LearningError } from "../../../../../../modules/vocabulary-learning/errors";
import { mutateLearningSession } from "../../../../../../modules/vocabulary-learning/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return learningRequest(request, async userId => {
    const { sessionId } = await params;
    if (!uuid(sessionId)) throw new LearningError("INVALID_INPUT", "Mã phiên chưa hợp lệ.");
    return mutateLearningSession(sessionId, userId, "answer", readMutationInput(await request.json().catch(() => null), "answer"));
  });
}
