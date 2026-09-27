"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";
import { isWeakPronunciationResult } from "../../modules/pronunciation-practice/scoring";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { createPronunciationPracticeSession, PronunciationApiError } from "./api";
import { levelLabels, problemSyllables, summarizeItems } from "./session-model";
import { ScoreRing } from "./score-ring";

export function PronunciationSummary({ session }: { session: ClientPronunciationSession }) {
  const router = useRouter();
  const summary = summarizeItems(session.items);
  const weak = session.items.filter((item) => item.latestSuccessfulAttempt && isWeakPronunciationResult(item.latestSuccessfulAttempt.result));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const locked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  async function practiceWeak() {
    if (locked.current) return;
    locked.current = true; setPending(true); setError("");
    try { router.push(await createPronunciationPracticeSession(fetch, { selection: "WEAK", sourceSessionId: session.sessionId })); }
    catch (reason) {
      if (reason instanceof PronunciationApiError && reason.status === 401) setReauth(true);
      setError(reason instanceof Error ? reason.message : "Không thể bắt đầu phiên luyện lại.");
      locked.current = false; setPending(false);
    }
  }
  return <section className="pron-summary card">
    <CircleCheck className="pron-completion-icon" aria-hidden="true" size={40} />
    <p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN</p>
    <h1 ref={heading} tabIndex={-1}>Từng từ, rõ ràng hơn</h1>
    <p>{session.topic.name} · {levelLabels[session.level]}</p>
    {summary.averageScore !== null && <><ScoreRing score={summary.averageScore} /><p>Điểm trung bình</p></>}
    <dl className="pron-summary-stats"><div><dt>Đã hoàn thành</dt><dd>{summary.completedCount}/{session.items.length}</dd></div><div><dt>Tốt (≥85)</dt><dd>{summary.goodCount}</dd></div><div><dt>Cần luyện thêm (70–84)</dt><dd>{summary.practiceCount}</dd></div><div><dt>Cần cải thiện (&lt;70)</dt><dd>{summary.weakCount}</dd></div></dl>
    {weak.length > 0 ? <div className="pron-weak-list"><h2>Từ nên luyện lại</h2><p className="pron-hint">Điểm từ dưới 80, âm tiết dưới 70, hoặc có âm tiết thiếu/thừa.</p><ul>{weak.map((item) => <li key={item.sessionItemId}><div><strong lang="en">{item.snapshot.word}</strong><span>{item.latestSuccessfulAttempt!.score}/100</span></div><p>{problemSyllables(item).length ? <>Âm tiết cần chú ý: {problemSyllables(item).map((part) => `${part.text || "∅"} (${part.accuracy}${part.isMissing ? ", thiếu" : ""}${part.isExtra ? ", thừa" : ""})`).join(" · ")}</> : "Nghe mẫu và luyện lại toàn bộ từ."}</p></li>)}</ul></div> : <p>Bạn đã hoàn thành tốt tất cả các từ trong phiên này.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="pron-actions">{weak.length > 0 && <button className="primary" disabled={pending} onClick={() => { void practiceWeak(); }} type="button"><RotateCcw aria-hidden="true" size={18} />{pending ? "Đang tạo phiên…" : `Luyện lại ${weak.length} từ cần chú ý`}</button>}<Link className="secondary" href="/pronunciation">Chọn phiên mới</Link><Link className="secondary" href="/dashboard">Về trang chủ</Link></div>
    <ReauthenticateDialog open={reauth} sessionId="" title="Đăng nhập lại để luyện tiếp" description="Kết quả phiên luyện của bạn đã được lưu." submitLabel="Đăng nhập và luyện tiếp" onAuthenticated={() => { setReauth(false); void practiceWeak(); }} onCancel={() => setReauth(false)} />
  </section>;
}
