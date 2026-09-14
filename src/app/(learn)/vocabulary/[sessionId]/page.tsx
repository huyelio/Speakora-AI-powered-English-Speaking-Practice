import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VocabularySession } from "../../../../components/vocabulary/vocabulary-session";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { getClientVocabularySession } from "../../../../modules/vocabulary/repository";

export const dynamic = "force-dynamic";

export default async function VocabularySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/vocabulary/${sessionId}`)}`);

  const session = await getClientVocabularySession(sessionId, user.id);
  if (!session) notFound();

  return (
    <div className="vocabulary-session-page">
      <Link className="back-link" href="/vocabulary">← Từ vựng</Link>
      <VocabularySession initial={session} />
    </div>
  );
}
