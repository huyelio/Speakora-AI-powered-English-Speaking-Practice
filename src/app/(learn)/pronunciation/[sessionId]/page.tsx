import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PronunciationSession } from "../../../../components/pronunciation/pronunciation-session";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { getClientPronunciationSession } from "../../../../modules/pronunciation-practice/repository";

export const dynamic = "force-dynamic";

export default async function PronunciationSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/pronunciation/${sessionId}`)}`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) notFound();
  const session = await getClientPronunciationSession(sessionId, user.id);
  if (!session) notFound();
  return <div className="pron-page"><Link className="back-link pron-back" href="/pronunciation"><ArrowLeft aria-hidden="true" size={18} />Luyện phát âm</Link><PronunciationSession key={session.sessionId} initial={session} /></div>;
}
