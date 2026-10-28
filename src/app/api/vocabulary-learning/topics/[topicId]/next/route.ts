import { learningRequest, uuid } from "../../../../../../modules/vocabulary-learning/http";
import { LearningError } from "../../../../../../modules/vocabulary-learning/errors";
import { listVocabularyTopicProgress } from "../../../../../../modules/vocabulary-learning/repository";
import { isLearnerLevel } from "../../../../../../modules/vocabulary/selection";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** What "Học tiếp" would start for this topic now: the same action the topic page shows. */
export async function GET(request: Request, { params }: { params: Promise<{ topicId: string }> }) {
  return learningRequest(request, async userId => {
    const { topicId } = await params;
    const level = new URL(request.url).searchParams.get("level");
    if (!uuid(topicId) || !isLearnerLevel(level)) throw new LearningError("INVALID_INPUT", "Chủ đề hoặc trình độ chưa hợp lệ.");
    const topic = (await listVocabularyTopicProgress(userId, level)).find(entry => entry.id === topicId.toLowerCase());
    if (!topic) throw new LearningError("TOPIC_NOT_FOUND", "Không tìm thấy chủ đề.", 404);
    return { action: topic.action, level: topic.level, total: topic.counts.total };
  });
}
