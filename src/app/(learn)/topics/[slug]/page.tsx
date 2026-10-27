import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopicStart } from "../../../../components/practice/topic-start";
import { TopicIcon } from "../../../../components/ui/topic-icon";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { getAvailableTopics } from "../../../../modules/topics/repository";
import { getTopicPresentation } from "../../../../modules/topics/presentation";
import { topicDisplayName } from "../../../../modules/topics/display-name";
import { learnerLevels, type LearnerLevel } from "../../../../modules/profile/types";

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ level?: string | string[] }>;
}) {
  const { slug } = await params;
  const requested = (await searchParams).level;
  const requestedLevel = typeof requested === "string" ? requested.toUpperCase() : "";
  const initialLevel = learnerLevels.includes(requestedLevel as LearnerLevel) ? requestedLevel as LearnerLevel : undefined;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/topics/${slug}`)}`);

  const topics = await getAvailableTopics(user.id);
  const topic = topics.find((item) => item.slug === slug);
  if (!topic) notFound();

  const presentation = getTopicPresentation(topic.slug, topic.name);
  return (
    <div className="topic-detail-page">
      <Link className="back-link" href="/speaking?tab=topics">← Luyện nói theo chủ đề</Link>
      <section className="topic-hero">
        <div>
          <p className="eyebrow">Luyện nói theo chủ đề · 5 câu</p>
          <h1>{topicDisplayName(topic.slug, topic.name)}</h1>
          <p className="lead">{presentation.context}</p>
        </div>
        <TopicIcon slug={topic.slug} size={144} />
      </section>

      <div className="topic-detail-grid">
        <section className="topic-context-card" aria-labelledby="practice-context-heading">
          <h2 id="practice-context-heading">Bối cảnh luyện nói</h2>
          <p>
            Bạn sẽ nghe và trả lời 5 câu hỏi theo chủ đề này.
            Bạn có thể nghe lại từng câu trước khi gửi. Sau đó, Speakora sẽ phân tích transcript.
          </p>
        </section>
        <section className="topic-vocabulary-card" aria-labelledby="vocabulary-heading">
          <h2 id="vocabulary-heading">Từ vựng gợi ý</h2>
          {presentation.vocabulary.length > 0 ? (
            <ul>{presentation.vocabulary.map((word) => <li key={word}>{word}</li>)}</ul>
          ) : (
            <p className="hint">Hãy dùng từ ngữ tự nhiên, phù hợp với trải nghiệm của bạn.</p>
          )}
          <Link className="secondary topic-vocab-cta" href={`/vocabulary/topics/${encodeURIComponent(topic.slug)}`}>
            Luyện từ vựng chủ đề này
          </Link>
        </section>
      </div>

      <section className="topic-level-card" aria-labelledby="topic-level-heading">
        <div>
          <p className="eyebrow">Sẵn sàng luyện tập</p>
          <h2 id="topic-level-heading">{topic.levels.length === 1 ? "Bắt đầu phiên luyện" : "Chọn trình độ phù hợp"}</h2>
          <p>Chỉ hiển thị trình độ có ít nhất 5 câu hỏi sẵn sàng.</p>
        </div>
        <TopicStart initialLevel={initialLevel} levels={topic.levels} topicId={topic.id} />
      </section>
    </div>
  );
}
