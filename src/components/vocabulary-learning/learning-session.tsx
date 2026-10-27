"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import { deriveState, hasImproved } from "../../modules/vocabulary-learning/rules";
import { PronunciationCard } from "../pronunciation/pronunciation-card";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { LearnWord } from "./learn-word";
import { topicDisplayName } from "../../modules/topics/display-name";
import { vocabularyTopicHref } from "../vocabulary-hub/hub-model";
import { LearningApiError, learningRequest } from "./api";
import { fetchTtsObjectUrl, ttsUrl } from "../audio/tts-client";

const stages = ["LEARN", "PRONOUNCE", "RECALL", "CONTEXT", "SUMMARY"] as const;
const labels = { LEARN: "Làm quen", PRONOUNCE: "Phát âm", RECALL: "Nhớ từ", CONTEXT: "Ngữ cảnh", SUMMARY: "Tổng kết" };
const stateLabels = { NEW: "Mới", LEARNING: "Đang học", WEAK: "Cần luyện thêm", MASTERED: "Thành thạo" };
type AnswerFeedback = { session: LearningSession; correct: boolean; word: string };

export function LearningSessionView({ initial }: { initial: LearningSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const locked = useRef(false);
  const retry = useRef<() => void>(() => {});
  const weakRequestId = useRef<string | null>(null);
  // Last state the server confirmed, and the ordered queue of optimistic Learn advances.
  const confirmed = useRef(initial);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const queued = useRef(0);
  const generation = useRef(0);
  const audio = useRef(new Map<string, Promise<string>>());
  useEffect(() => {
    const cache = audio.current;
    // Clear as well as revoke, so a Strict Mode remount never reuses a revoked URL.
    return () => { for (const url of cache.values()) void url.then(value => URL.revokeObjectURL(value), () => {}); cache.clear(); };
  }, []);
  const item = session.stage === "CONTEXT" ? session.items.find(entry => entry.sessionItemId === session.contextItemIds[session.cursor]) : session.items[session.cursor];
  const total = session.stage === "CONTEXT" ? session.contextItemIds.length : session.items.length;
  const pronounceItem = item && session.pronunciation.items.find(entry => entry.vocabularyItemId === item.vocabularyItemId);

  function commit(next: LearningSession) { confirmed.current = next; setSession(next); }
  function loadAudio(sessionItemId: string): Promise<string> {
    const cached = audio.current.get(sessionItemId);
    if (cached) return cached;
    const request = fetchTtsObjectUrl(ttsUrl("vocabulary", session.sessionId, sessionItemId));
    audio.current.set(sessionItemId, request);
    request.catch(() => audio.current.delete(sessionItemId));
    return request;
  }
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    retry.current = () => { void run(action); };
    try { await queue.current; await action(); }
    catch (reason) {
      if (reason instanceof LearningApiError && reason.status === 401) setReauth(true);
      setError(reason instanceof Error ? reason.message : "Không thể lưu. Hãy thử lại.");
    } finally { locked.current = false; setBusy(false); }
  }
  function advance(skip = false) {
    if (!item) return;
    const body = { stage: session.stage, sessionItemId: item.sessionItemId, ...(skip ? { skip: true } : {}) };
    // Learn words are already on the client: show the next one now and save in order behind it.
    // The last Learn word changes stage, so it waits for the server like every other step.
    if (session.stage === "LEARN" && session.cursor < session.items.length - 1 && !locked.current) {
      setError("");
      setSession(previous => ({ ...previous, cursor: previous.cursor + 1 }));
      const current = generation.current;
      queued.current += 1;
      queue.current = queue.current.then(async () => {
        if (current !== generation.current) return;
        try {
          const next = await learningRequest<LearningSession>(`/${session.sessionId}/advance`, body);
          confirmed.current = next;
          if (--queued.current === 0) setSession(next);
        } catch (reason) {
          generation.current += 1; queued.current = 0;
          setSession(confirmed.current);
          if (reason instanceof LearningApiError && reason.status === 401) { retry.current = () => {}; setReauth(true); }
          setError("Chưa lưu được tiến độ, bạn được đưa về từ chưa lưu. Hãy bấm Tiếp tục lại.");
        }
      });
      return;
    }
    void run(async () => commit(await learningRequest<LearningSession>(`/${session.sessionId}/advance`, body)));
  }
  function submitAnswer() {
    if (!item || !answer.trim()) return;
    void run(async () => { setFeedback(await learningRequest<AnswerFeedback>(`/${session.sessionId}/answers`, { stage: session.stage, sessionItemId: item.sessionItemId, answer })); });
  }
  function reviewWeak() {
    weakRequestId.current ??= crypto.randomUUID();
    void run(async () => {
      const next = await learningRequest<LearningSession>("", { topicId: session.topic.id, level: session.level, sourceSessionId: session.sessionId, requestId: weakRequestId.current });
      router.push(`/vocabulary-learning/${next.sessionId}`);
    });
  }
  return <div className="vl-session" aria-busy={busy}>
    <header className="page-heading"><p className="eyebrow">{topicDisplayName(session.topic.slug, session.topic.name)}</p><h1>{labels[session.stage]}</h1></header>
    <ol className="vl-stages" aria-label="Các bước học">{stages.map(stage => <li key={stage} aria-current={stage === session.stage ? "step" : undefined}>{labels[stage]}</li>)}</ol>
    {session.stage !== "SUMMARY" && <p className="vl-progress" role="status">Từ {session.cursor + 1} / {total}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {session.stage === "LEARN" && item && <LearnWord key={item.sessionItemId} item={item} busy={busy} loadAudio={loadAudio} onPlayed={() => { const next = session.items[session.cursor + 1]; if (next) void loadAudio(next.sessionItemId).catch(() => {}); }} onNext={() => advance()} />}
    {session.stage === "PRONOUNCE" && pronounceItem && <div className={busy ? "vl-saving" : undefined}><PronunciationCard key={pronounceItem.sessionItemId} sessionId={session.pronunciation.sessionId} item={pronounceItem} isLast={session.cursor === session.items.length - 1} feedbackMode="learning-v2" nextLabel={session.cursor === session.items.length - 1 ? "Tiếp tục nhớ từ" : "Từ tiếp theo"} canRecord={session.pronunciation.status === "IN_PROGRESS"} onSuccess={pronunciation => { confirmed.current = { ...confirmed.current, pronunciation }; setSession(previous => ({ ...previous, pronunciation })); }} onNext={() => advance()} />
      {!pronounceItem.latestSuccessfulAttempt && <p className="vl-skip"><button className="a5-text-link" disabled={busy} onClick={() => advance(true)} type="button">{busy ? "Đang chuyển…" : "Bỏ qua từ này"}</button><small>Từ bỏ qua chưa được chấm phát âm nên chưa thể thành “Đã thuộc”.</small></p>}</div>}
    {(session.stage === "RECALL" || session.stage === "CONTEXT") && item && <section className="card vl-answer" key={`${session.stage}-${item.sessionItemId}`}>
      <h2>{session.stage === "RECALL" ? "Từ tiếng Anh nào có nghĩa này?" : "Điền từ còn thiếu"}</h2>
      <p className="vl-prompt" lang={session.stage === "CONTEXT" ? "en" : "vi"}>{session.stage === "RECALL" ? item.snapshot.meaning_vi : item.snapshot.context_prompt}</p>
      {feedback ? <div role="status"><h3>{feedback.correct ? "Chính xác!" : "Cùng ghi nhớ lại"}</h3><p>Đáp án: <strong lang="en">{feedback.word}</strong></p><p>{item.snapshot.meaning_vi}</p><button className="primary" onClick={() => { commit(feedback.session); setFeedback(null); setAnswer(""); }}>Tiếp tục</button></div> : <form onSubmit={event => { event.preventDefault(); submitAnswer(); }}><label htmlFor="learning-answer">Từ tiếng Anh</label><input id="learning-answer" key={`${session.stage}-${item.sessionItemId}`} autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} value={answer} onChange={event => setAnswer(event.target.value)} disabled={busy} /><button className="primary" disabled={busy || !answer.trim()}>{busy ? "Đang kiểm tra…" : "Kiểm tra"}</button></form>}
    </section>}
    {session.stage === "SUMMARY" && <section className="card vl-summary"><h2>Bạn đã hoàn thành phiên học</h2><p>{session.items.filter(entry => hasImproved(entry.snapshot.initial_evidence, entry.evidence)).length} / {session.items.length} từ có tiến bộ trong phiên này.</p>
      {!session.contextItemIds.length && <p>Đã bỏ qua ngữ cảnh vì chưa có câu ví dụ phù hợp để điền từ.</p>}
      <ul className="vl-results">{session.items.map(entry => <li key={entry.sessionItemId}><div><strong lang="en">{entry.snapshot.word}</strong><span>{stateLabels[deriveState(entry.snapshot.initial_evidence)]} → {stateLabels[deriveState(entry.evidence)]}</span></div><p>Nhớ từ: {entry.review === "REMEMBERED" ? "Đúng" : entry.review === "NOT_REMEMBERED" ? "Cần ôn lại" : "Chưa trả lời"} · Phát âm: {entry.evidence.pronunciation === "GOOD" ? "Tốt" : entry.evidence.pronunciation === "WEAK" ? "Cần luyện thêm" : "Chưa đủ dữ liệu"}</p>{session.contextItemIds.includes(entry.sessionItemId) && <p>Ngữ cảnh: {entry.contextResult === "REMEMBERED" ? "Đúng" : entry.contextResult === "NOT_REMEMBERED" ? "Cần ôn lại" : "Chưa trả lời"}</p>}{hasImproved(entry.snapshot.initial_evidence, entry.evidence) && <small>Đã tiến bộ</small>}</li>)}</ul>
      <div className="vl-actions">{session.items.some(entry => deriveState(entry.evidence) === "WEAK") && <button className="primary" disabled={busy} onClick={reviewWeak}>{busy ? "Đang tạo phiên…" : "Luyện lại từ còn yếu"}</button>}<Link className="secondary" href={vocabularyTopicHref(session.topic.slug)}>Về chủ đề</Link><Link className="secondary" href="/vocabulary">Chọn chủ đề khác</Link><Link href="/dashboard">Về trang chủ</Link></div>
    </section>}
    <ReauthenticateDialog open={reauth} sessionId={session.sessionId} onAuthenticated={() => { setReauth(false); retry.current(); }} onCancel={() => setReauth(false)} />
  </div>;
}
