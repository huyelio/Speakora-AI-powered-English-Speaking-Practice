"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AudioLines } from "lucide-react";
import type { LearnerLevel } from "../../modules/profile/types";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { createPronunciationPracticeSession, PronunciationApiError } from "./api";
import { levelLabels } from "./session-model";

type Topic = { id: string; name: string; slug: string; levels: { level: LearnerLevel; count: number }[]; totalCount: number };

export function PronunciationStart({ topics, preferredSlug }: { topics: Topic[]; preferredSlug?: string }) {
  const router = useRouter();
  const preferred = topics.find((topic) => topic.slug === preferredSlug) ?? topics[0];
  const [topicId, setTopicId] = useState(preferred?.id ?? "");
  const selected = topics.find((topic) => topic.id === topicId);
  const [level, setLevel] = useState<LearnerLevel>(preferred?.levels[0]?.level ?? "BEGINNER");
  const [count, setCount] = useState("10");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const locked = useRef(false);
  const available = selected?.levels.find((entry) => entry.level === level)?.count ?? 0;
  const valid = Number.isInteger(Number(count)) && Number(count) >= 1 && Number(count) <= 20 && Number(count) <= available;
  async function start() {
    if (locked.current || !selected || !valid) return;
    locked.current = true; setPending(true); setError("");
    try { router.push(await createPronunciationPracticeSession(fetch, { topicId: selected.id, level, itemCount: Number(count) })); }
    catch (reason) {
      if (reason instanceof PronunciationApiError && reason.status === 401) setReauth(true);
      setError(reason instanceof Error ? reason.message : "Không thể tạo phiên. Vui lòng thử lại.");
      locked.current = false; setPending(false);
    }
  }
  if (!topics.length) return <div className="pron-empty"><AudioLines aria-hidden="true" size={32} /><h2>Chưa có từ để luyện</h2><p>Các chủ đề có từ và phiên âm sẽ xuất hiện tại đây. Hãy quay lại sau.</p></div>;
  return <>
    <form className="pron-start" onSubmit={(event) => { event.preventDefault(); void start(); }}>
      <label className="pron-field"><span>Chủ đề</span><select value={topicId} disabled={pending} onChange={(event) => {
        setTopicId(event.target.value); setLevel(topics.find((topic) => topic.id === event.target.value)?.levels[0]?.level ?? "BEGINNER");
      }}>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <label className="pron-field"><span>Trình độ</span><select value={level} disabled={pending} onChange={(event) => setLevel(event.target.value as LearnerLevel)}>
        {selected?.levels.map((entry) => <option key={entry.level} value={entry.level}>{levelLabels[entry.level]} · {entry.count} từ</option>)}
      </select></label>
      <label className="pron-field"><span>Số từ (1–20)</span><input aria-describedby="pron-count-help" min={1} max={Math.min(20, available)} step={1} required disabled={pending} type="number" value={count} onChange={(event) => setCount(event.target.value)} /></label>
      <p className="pron-hint" id="pron-count-help">Có {available} từ sẵn sàng ở trình độ này.{Number(count) > available ? " Hãy chọn số từ nhỏ hơn." : " Mỗi từ là một lượt nghe và luyện nói."}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={pending || !valid} type="submit">{pending ? "Đang tạo phiên…" : "Bắt đầu luyện phát âm"}<ArrowRight aria-hidden="true" size={18} /></button>
    </form>
    <ReauthenticateDialog open={reauth} sessionId="" title="Đăng nhập lại để bắt đầu" description="Lựa chọn của bạn vẫn được giữ trên trang này." submitLabel="Đăng nhập và tiếp tục" onAuthenticated={() => { setReauth(false); void start(); }} onCancel={() => setReauth(false)} />
  </>;
}
