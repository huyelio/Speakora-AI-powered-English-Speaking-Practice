import { redirect } from "next/navigation";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { listPronunciationTopicAvailability } from "../../../modules/pronunciation-practice/repository";
import { getLatestLearningSessionId } from "../../../modules/vocabulary-learning/repository";
import { LearningStart } from "../../../components/vocabulary-learning/learning-start";

export const dynamic = "force-dynamic";
export default async function VocabularyLearningPage() {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/vocabulary-learning");
  const [topics, resumeId] = await Promise.all([listPronunciationTopicAvailability(), getLatestLearningSessionId(user.id)]);
  return <><header className="page-heading"><p className="eyebrow">VOCABULARY LEARNING V2</p><h1>Học từ để nhớ và sử dụng</h1><p>Làm quen → Phát âm → Nhớ từ → Ngữ cảnh → Tổng kết</p></header><section className="card session-setup-card"><LearningStart topics={topics} resumeId={resumeId} /></section></>;
}
