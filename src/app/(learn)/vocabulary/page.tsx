import Link from "next/link";
import { redirect } from "next/navigation";
import { VocabularyStart } from "../../../components/vocabulary/vocabulary-start";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { listVocabularyTopicAvailability } from "../../../modules/vocabulary/repository";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/vocabulary");

  const { topic: preferredSlug } = await searchParams;
  const topics = await listVocabularyTopicAvailability(user.id);

  return (
    <div className="vocabulary-page">
      <header className="page-heading">
        <p className="eyebrow">VOCABULARY PRACTICE</p>
        <h1>Luyện từ vựng nhanh</h1>
        <p>Xem nghĩa tiếng Việt, tự đoán trong đầu, rồi tự đánh giá Đã nhớ / Chưa nhớ.</p>
      </header>

      <section className="vocab-start-card card">
        <h2>Chọn chủ đề và bắt đầu</h2>
        <VocabularyStart preferredSlug={preferredSlug} topics={topics} />
      </section>

      <p className="hint">
        Muốn luyện nói thay vì flashcard? <Link href="/explore">Quay lại Explore</Link>
      </p>
    </div>
  );
}
