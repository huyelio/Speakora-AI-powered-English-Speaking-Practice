import { learningRequest, readCreateInput } from "../../../../modules/vocabulary-learning/http";
import { createLearningSession } from "../../../../modules/vocabulary-learning/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return learningRequest(request, async userId => createLearningSession(userId, readCreateInput(await request.json().catch(() => null))), 201);
}
