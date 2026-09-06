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
    return <div className="history-detail"><Link className="back-link" href="/history">← Quay lại lịch sử</Link><ResultView answers={await getAnswerReview(session.id)} experience={experience} principalKind="user" result={result} /></div>;
  }

  const status = await getSessionStatus(session.id);
  return (
    <div className="history-detail">
      <Link className="back-link" href="/history">← Quay lại lịch sử</Link>
      <section className="dashboard-card history-status-card">
        <p className="eyebrow">PHIÊN {session.mode}</p>
        <h1>{session.status === "FAILED" ? "Phiên này cần được xử lý lại" : "Kết quả vẫn đang được xử lý"}</h1>
        <p>Đã chuyển đổi {status.completed}/{status.total} câu · Trạng thái đánh giá: {status.assessmentStatus === "COMPLETED" ? "Hoàn thành" : status.assessmentStatus === "FAILED" ? "Có lỗi" : "Đang xử lý"}</p>
        <Link className="primary" href={`/practice/${session.id}`}>{session.status === "FAILED" ? "Mở phần thử lại" : "Xem trạng thái phiên"}</Link>
      </section>
    </div>
  );
}
