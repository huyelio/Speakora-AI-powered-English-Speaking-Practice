import { redirect } from "next/navigation";
import { PronunciationPreview } from "../../../components/pronunciation/pronunciation-preview";
import { PronunciationStart } from "../../../components/pronunciation/pronunciation-start";
import { parseTopicSlug, parseVocabularyMode } from "../../../components/vocabulary-hub/hub-model";
import { VocabularyHub } from "../../../components/vocabulary-hub/vocabulary-hub";
import { LearningStart } from "../../../components/vocabulary-learning/learning-start";
import { VocabularyStart } from "../../../components/vocabulary/vocabulary-start";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { listPronunciationTopicAvailability } from "../../../modules/pronunciation-practice/repository";
import { listVocabularyTopicAvailability } from "../../../modules/vocabulary/repository";
import { getLearningResumeSummary } from "../../../modules/vocabulary-learning/repository";
import "../vocabulary-learning/vocabulary-learning.css";

export const dynamic = "force-dynamic";

type SearchParams = { mode?: string | string[]; topic?: string | string[] };

/**
 * Vocabulary hub. `/vocabulary-learning` and `/pronunciation` redirect here with
 * `?mode=`; their session URLs (`/<sessionId>`) are untouched.
 */
export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/vocabulary");
  const params = await searchParams;
  const mode = parseVocabularyMode(params.mode);
  const topic = parseTopicSlug(params.topic);

  const [topics, resume] = await Promise.all([
    listPronunciationTopicAvailability(),
    getLearningResumeSummary(user.id).catch(() => null),
  ]);

  let panel = null;
  if (mode === "learn") {
    panel = (
      <div className="vocabulary-learning pron-page pron-setup-page">
        <section className="card session-setup-card">
          <LearningStart preferredSlug={topic} resumeId={resume?.sessionId ?? null} topics={topics} />
        </section>
      </div>
    );
  } else if (mode === "review") {
    const reviewTopics = await listVocabularyTopicAvailability(user.id);
    panel = (
      <div className="vocabulary-page session-setup-page">
        <section className="vocab-start-card session-setup-card card">
          <div className="session-setup-card-heading">
            <h2>Chọn chủ đề và bắt đầu</h2>
            <p>Xem nghĩa tiếng Việt, tự đoán trong đầu, rồi tự đánh giá Đã nhớ / Chưa nhớ.</p>
          </div>
          <VocabularyStart preferredSlug={topic} topics={reviewTopics} />
        </section>
      </div>
    );
  } else if (mode === "pronounce") {
    panel = (
      <div className="pron-page pron-setup-page session-setup-page">
        <div className="pron-setup-layout">
          <section className="pron-start-card session-setup-card card">
            <div className="pron-setup-card-heading session-setup-card-heading">
              <h2>Chọn phiên luyện của bạn</h2>
              <p>Nghe mẫu, ghi âm và biết âm tiết nào cần luyện thêm.</p>
            </div>
            <PronunciationStart preferredSlug={topic} topics={topics} />
          </section>
          {topics.length > 0 && <PronunciationPreview />}
        </div>
      </div>
    );
  }

  return <VocabularyHub mode={mode} panel={panel} resume={resume} topic={topic} topics={topics} />;
}
