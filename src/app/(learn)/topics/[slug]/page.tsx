import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopicStart } from "../../../../components/practice/topic-start";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { getAvailableTopics } from "../../../../modules/topics/repository";
import { getTopicPresentation } from "../../../../modules/topics/presentation";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/topics/${slug}`)}`);

  const topics = await getAvailableTopics(user.id);
  const topic = topics.find((item) => item.slug === slug);
  if (!topic) notFound();

  const presentation = getTopicPresentation(topic.slug, topic.name);
  return (
    <div className="topic-detail-page">
      <Link className="back-link" href="/explore">← Khám phá chủ đề</Link>
      <section className="topic-hero">
        <div>
          <p className="eyebrow">GENERAL ENGLISH · 5 CÂU</p>
          <h1>{topic.name}</h1>
          <p className="lead">{presentation.context}</p>
        </div>
        <div aria-hidden="true" className="topic-hero-mark">{topic.name.slice(0, 1)}</div>
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
          <Link className="secondary topic-vocab-cta" href={`/vocabulary?topic=${encodeURIComponent(topic.slug)}`}>
            Luyện từ vựng chủ đề này
          </Link>
        </section>
      </div>

      <section className="topic-level-card" aria-labelledby="topic-level-heading">
        <div>
          <p className="eyebrow">SẴN SÀNG LUYỆN TẬP</p>
          <h2 id="topic-level-heading">Chọn trình độ phù hợp</h2>
          <p>Chỉ hiển thị trình độ có ít nhất 5 câu hỏi sẵn sàng.</p>
        </div>
        <TopicStart levels={topic.levels} topicId={topic.id} />
      </section>
    </div>
  );
}
