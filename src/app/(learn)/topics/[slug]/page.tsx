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
            Bạn sẽ nghe và trả lời năm câu hỏi đã được chuẩn bị theo chủ đề này.
            Mỗi câu trả lời được nghe lại trước khi gửi và sau đó được phân tích từ transcript.
          </p>
        </section>
        <section className="topic-vocabulary-card" aria-labelledby="vocabulary-heading">
          <h2 id="vocabulary-heading">Từ vựng gợi ý</h2>
          {presentation.vocabulary.length > 0 ? (
            <ul>{presentation.vocabulary.map((word) => <li key={word}>{word}</li>)}</ul>
          ) : (
            <p className="hint">Hãy dùng từ ngữ tự nhiên phù hợp với trải nghiệm của bạn.</p>
          )}
        </section>
      </div>

      <section className="topic-level-card" aria-labelledby="topic-level-heading">
        <div>
          <p className="eyebrow">SẴN SÀNG LUYỆN TẬP</p>
          <h2 id="topic-level-heading">Chọn mức độ phù hợp</h2>
          <p>Chỉ những mức có đủ ít nhất năm câu hỏi đang hoạt động mới xuất hiện.</p>
        </div>
        <TopicStart levels={topic.levels} topicId={topic.id} />
      </section>
    </div>
  );
}
