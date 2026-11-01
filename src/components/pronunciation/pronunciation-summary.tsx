"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { createPronunciationPracticeSession, PronunciationApiError } from "./api";
import { isWordSuccessful, summarizeItems } from "./session-model";
import { topicDisplayName } from "../../modules/topics/display-name";
import { vocabularyTopicHref } from "../vocabulary-hub/hub-model";
import { useT } from "../../i18n/client";

export function PronunciationSummary({ session }: { session: ClientPronunciationSession }) {
  const t = useT();
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
      setError(reason instanceof Error ? reason.message : t("Không thể bắt đầu phiên luyện lại."));
      locked.current = false; setPending(false);
    }
  }
  return <section className="pron-summary card">
    <CircleCheck className="pron-completion-icon" aria-hidden="true" size={40} />
    <p className="eyebrow">{t("HOÀN THÀNH PHIÊN LUYỆN")}</p>
    <h1 ref={heading} tabIndex={-1}>{t("Từng từ, rõ ràng hơn")}</h1>
    <p>{t.dynamic(topicDisplayName(session.topic.slug, session.topic.name))}</p>
    <dl className="pron-summary-stats"><div><dt>{t("Từ đã luyện")}</dt><dd>{summary.completedCount}/{session.items.length}</dd></div><div><dt>{t("Nên luyện lại")}</dt><dd>{weak.length}</dd></div></dl>
    {weak.length > 0 ? <div className="pron-weak-list"><h2>{t("Từ nên luyện lại")}</h2><ul>{weak.map((item) => <li key={item.sessionItemId}><strong lang="en">{item.snapshot.word}</strong></li>)}</ul></div> : <p>{t("Bạn đã hoàn thành tốt tất cả các từ trong phiên này.")}</p>}
    {error && <p className="error" role="alert">{t.dynamic(error)}</p>}
    <div className="pron-actions">{weak.length > 0 && <button className="primary" disabled={pending} onClick={() => { void practiceWeak(); }} type="button"><RotateCcw aria-hidden="true" size={18} />{pending ? t("Đang tạo phiên…") : t("Luyện lại {0} từ cần chú ý", weak.length)}</button>}<Link className="secondary" href={vocabularyTopicHref(session.topic.slug)}>{t("Về chủ đề")}</Link><Link className="secondary" href="/dashboard">{t("Về trang chủ")}</Link></div>
    <ReauthenticateDialog open={reauth} sessionId="" title={t("Đăng nhập lại để luyện tiếp")} description={t("Kết quả phiên luyện của bạn đã được lưu.")} submitLabel={t("Đăng nhập và luyện tiếp")} onAuthenticated={() => { setReauth(false); void practiceWeak(); }} onCancel={() => setReauth(false)} />
  </section>;
}
