import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VocabularySession } from "../../../../components/vocabulary/vocabulary-session";
import { vocabularyTopicHref } from "../../../../components/vocabulary-hub/hub-model";
import { topicDisplayName } from "../../../../modules/topics/display-name";
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
  if (session.sessionKind === "LEARNING_V2") redirect(`/vocabulary-learning/${sessionId}`);

  return (
    <div className="vocabulary-session-page">
      <Link className="back-link vt-back" href={vocabularyTopicHref(session.topic.slug)}><ArrowLeft aria-hidden="true" size={18} />{topicDisplayName(session.topic.slug, session.topic.name)}</Link>
      <VocabularySession initial={session} />
    </div>
  );
}
