"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { createPronunciationPracticeSession, PronunciationApiError } from "./api";
import { isWordSuccessful, levelLabels, summarizeItems } from "./session-model";

export function PronunciationSummary({ session }: { session: ClientPronunciationSession }) {
  const router = useRouter();
  const summary = summarizeItems(session.items);
  const weak = session.items.filter((item) => {
    const syllables = item.latestSuccessfulAttempt?.result.words.flatMap((word) => word.syllables) ?? [];
    return item.latestSuccessfulAttempt && !isWordSuccessful(syllables);
  });
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
    <dl className="pron-summary-stats"><div><dt>Từ đã luyện</dt><dd>{summary.completedCount}/{session.items.length}</dd></div><div><dt>Nên luyện lại</dt><dd>{weak.length}</dd></div></dl>
    {weak.length > 0 ? <div className="pron-weak-list"><h2>Từ nên luyện lại</h2><ul>{weak.map((item) => <li key={item.sessionItemId}><strong lang="en">{item.snapshot.word}</strong></li>)}</ul></div> : <p>Bạn đã hoàn thành tốt tất cả các từ trong phiên này.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="pron-actions">{weak.length > 0 && <button className="primary" disabled={pending} onClick={() => { void practiceWeak(); }} type="button"><RotateCcw aria-hidden="true" size={18} />{pending ? "Đang tạo phiên…" : `Luyện lại ${weak.length} từ cần chú ý`}</button>}<Link className="secondary" href="/pronunciation">Chọn phiên mới</Link><Link className="secondary" href="/dashboard">Về trang chủ</Link></div>
    <ReauthenticateDialog open={reauth} sessionId="" title="Đăng nhập lại để luyện tiếp" description="Kết quả phiên luyện của bạn đã được lưu." submitLabel="Đăng nhập và luyện tiếp" onAuthenticated={() => { setReauth(false); void practiceWeak(); }} onCancel={() => setReauth(false)} />
  </section>;
}
