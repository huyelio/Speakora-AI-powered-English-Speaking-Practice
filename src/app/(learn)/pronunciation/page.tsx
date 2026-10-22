import Link from "next/link";
import { redirect } from "next/navigation";
import { PronunciationStart } from "../../../components/pronunciation/pronunciation-start";
import { PronunciationPreview } from "../../../components/pronunciation/pronunciation-preview";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { listPronunciationTopicAvailability } from "../../../modules/pronunciation-practice/repository";

export const dynamic = "force-dynamic";

export default async function PronunciationPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/pronunciation");
  const [{ topic }, topics] = await Promise.all([
    searchParams,
    listPronunciationTopicAvailability(),
  ]);
  return (
    <div className="pron-page pron-setup-page session-setup-page">
      <header className="page-heading">
        <p className="eyebrow">PRONUNCIATION PRACTICE</p>
        <h1>Luyện phát âm từng từ</h1>
        <p>Nghe mẫu, ghi âm và biết âm tiết nào cần luyện thêm.</p>
      </header>
      <div className="pron-setup-layout">
        <section className="pron-start-card session-setup-card card">
          <div className="pron-setup-card-heading session-setup-card-heading">
            <span className="eyebrow">PHIÊN LUYỆN CỦA BẠN</span>
            <h2>Chọn phiên luyện của bạn</h2>
            <p></p>
          </div>
          <PronunciationStart topics={topics} preferredSlug={topic} />
        </section>
        {topics.length > 0 && <PronunciationPreview />}
      </div>
      <p className="pron-hint">
        Muốn ôn nghĩa của từ? <Link href="/vocabulary">Luyện từ vựng</Link>
      </p>
    </div>
  );
}
