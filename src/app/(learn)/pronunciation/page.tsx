import Link from "next/link";
import { redirect } from "next/navigation";
import { PronunciationStart } from "../../../components/pronunciation/pronunciation-start";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { listPronunciationTopicAvailability } from "../../../modules/pronunciation-practice/repository";

export const dynamic = "force-dynamic";

export default async function PronunciationPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/pronunciation");
  const [{ topic }, topics] = await Promise.all([searchParams, listPronunciationTopicAvailability()]);
  return <div className="pron-page">
    <header className="page-heading"><p className="eyebrow">PRONUNCIATION PRACTICE</p><h1>Luyện phát âm từng từ</h1><p>Nghe mẫu, ghi âm và biết âm tiết nào cần luyện thêm.</p></header>
    <section className="pron-start-card card"><h2>Chọn phiên luyện của bạn</h2><PronunciationStart topics={topics} preferredSlug={topic} /></section>
    <p className="pron-hint">Muốn ôn nghĩa của từ? <Link href="/vocabulary">Luyện từ vựng</Link></p>
  </div>;
}
