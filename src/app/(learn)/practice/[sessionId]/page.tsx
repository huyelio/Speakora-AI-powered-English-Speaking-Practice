import { notFound, redirect } from "next/navigation";
import { PracticeSession } from "../../../../components/practice/practice-session";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import {
  authorizeSession,
  getClientPracticeSession,
} from "../../../../modules/practice/repository";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/practice/${sessionId}`)}`);

  const session = await authorizeSession(sessionId, { kind: "user", userId: user.id });
  if (!session) notFound();

  const safeSession = await getClientPracticeSession(session);
  return (
    <div className="practice-route">
      <PracticeSession initialSession={safeSession} principalKind="user" />
    </div>
  );
}
