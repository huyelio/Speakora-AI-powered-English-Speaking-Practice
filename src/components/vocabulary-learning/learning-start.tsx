"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopicIllustration } from "../topics/topic-illustration";
import { levelLabels } from "../pronunciation/session-model";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import type { LearnerLevel } from "../../modules/profile/types";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import { LearningApiError, learningRequest } from "./api";

type Topic = { id: string; name: string; slug: string; levels: { level: LearnerLevel; count: number }[]; totalCount: number };
export function LearningStart({ topics, resumeId, preferredSlug }: { topics: Topic[]; resumeId: string | null; preferredSlug?: string }) {
  const preferred = topics.find(entry => entry.slug === preferredSlug) ?? topics[0];
  const router = useRouter();
  const [topicId, setTopicId] = useState(preferred?.id ?? "");
  const [level, setLevel] = useState<LearnerLevel>(preferred?.levels[0]?.level ?? "BEGINNER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [allMastered, setAllMastered] = useState(false);
  const [reauth, setReauth] = useState(false);
  const requestId = useRef<string | null>(null);
  const selection = useRef<"MASTERED" | undefined>(undefined);
  const locked = useRef(false);
  const topic = topics.find(entry => entry.id === topicId);
  function reset() { requestId.current = null; selection.current = undefined; setAllMastered(false); setError(""); }
  async function start(mastered = false) {
    if (locked.current || !topic) return;
    if ((mastered ? "MASTERED" : undefined) !== selection.current) { requestId.current = null; selection.current = mastered ? "MASTERED" : undefined; }
    requestId.current ??= crypto.randomUUID();
    locked.current = true; setBusy(true); setError("");
    try {
      const session = await learningRequest<LearningSession>("", { topicId, level, requestId: requestId.current, selection: selection.current });
      router.push(`/vocabulary-learning/${session.sessionId}`);
    } catch (reason) {
      if (reason instanceof LearningApiError) { setAllMastered(reason.code === "ALL_MASTERED"); if (reason.status === 401) setReauth(true); }
      setError(reason instanceof Error ? reason.message : "Không thể tạo phiên. Hãy thử lại.");
      locked.current = false; setBusy(false);
    }
  }
  return <>
    {resumeId && <Link className="secondary vl-resume" href={`/vocabulary-learning/${resumeId}`}>Tiếp tục phiên đang học</Link>}
    {!topics.length ? <p className="empty-state">Chưa có từ kèm phiên âm để học. Hãy quay lại sau.</p> : <form onSubmit={event => { event.preventDefault(); void start(); }}>
      <fieldset disabled={busy} className="pron-setup-group"><legend>1. Chọn chủ đề</legend><div className="session-topic-grid">
        {topics.map(entry => <label key={entry.id} className="pron-choice session-topic-choice"><input type="radio" name="learning-topic" checked={entry.id === topicId} onChange={() => { reset(); setTopicId(entry.id); setLevel(entry.levels[0]?.level ?? "BEGINNER"); }} /><span className="session-topic-card"><TopicIllustration className="pron-topic-thumbnail" name={entry.name} slug={entry.slug} /><span className="session-topic-copy"><strong>{topicDisplayName(entry.slug, entry.name)}</strong><small>{entry.totalCount} từ</small></span></span></label>)}
      </div></fieldset>
      <fieldset disabled={busy} className="pron-setup-group"><legend>2. Chọn trình độ</legend><div className="pron-level-options">
        {topic?.levels.map(entry => <label className="pron-choice pron-level-choice" key={entry.level}><input type="radio" name="learning-level" checked={entry.level === level} onChange={() => { reset(); setLevel(entry.level); }} /><span><strong>{levelLabels[entry.level]}</strong><small>{entry.count} từ sẵn sàng</small></span></label>)}
      </div></fieldset>
      <p>Mỗi phiên tối đa 6 từ. Ưu tiên từ cần luyện thêm và từ mới.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="vl-actions"><button className="primary" disabled={busy || !topic?.levels.length} type="submit">{busy ? "Đang tạo phiên…" : "Bắt đầu học"}</button>
      {allMastered && <button className="secondary" disabled={busy} type="button" onClick={() => void start(true)}>Ôn lại từ đã thành thạo</button>}</div>
    </form>}
    <ReauthenticateDialog open={reauth} sessionId="" onAuthenticated={() => { setReauth(false); void start(selection.current === "MASTERED"); }} onCancel={() => setReauth(false)} />
  </>;
}
