import { notFound, redirect } from "next/navigation";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { getLearningSession } from "../../../../modules/vocabulary-learning/repository";
import { LearningSessionView } from "../../../../components/vocabulary-learning/learning-session";

export const dynamic = "force-dynamic";
export default async function LearningSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/vocabulary-learning/${sessionId}`)}`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) notFound();
  const session = await getLearningSession(sessionId, user.id);
  if (!session) notFound();
  // The session's own top bar has the exit back to the topic page.
  return <LearningSessionView key={session.sessionId} initial={session} />;
}
