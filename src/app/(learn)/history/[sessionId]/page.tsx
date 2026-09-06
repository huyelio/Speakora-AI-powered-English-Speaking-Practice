import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { ResultView } from "../../../../components/practice/result-view";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { authorizeSession, getAnswerReview, getAssessment, getGeneralResultExperience, getSessionStatus } from "../../../../modules/practice/repository";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/history/${sessionId}`)}`);
  const session = await authorizeSession(sessionId, { kind: "user", userId: user.id });
  if (!session) notFound();
  const result = await getAssessment(session.id, session.mode);

  if (result) {
    const experience = result.mode === "GENERAL"
      ? await getGeneralResultExperience(session, result)
      : undefined;
    return <div className="history-detail"><Link className="back-link" href="/history">← Back to history</Link><ResultView answers={await getAnswerReview(session.id)} experience={experience} principalKind="user" result={result} /></div>;
  }

  const status = await getSessionStatus(session.id);
  return (
    <div className="history-detail">
      <Link className="back-link" href="/history">← Back to history</Link>
      <section className="dashboard-card history-status-card">
        <p className="eyebrow">{session.mode} SESSION</p>
        <h1>{session.status === "FAILED" ? "This session needs attention" : "Your result is still processing"}</h1>
        <p>{status.completed}/{status.total} answers transcribed · Assessment {status.assessmentStatus.toLowerCase()}</p>
        <Link className="primary" href={`/practice/${session.id}`}>{session.status === "FAILED" ? "Open retry controls" : "Open live session status"}</Link>
      </section>
    </div>
  );
}
