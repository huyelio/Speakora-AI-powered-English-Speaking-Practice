"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AudioLines, Check, Clock3, Mic } from "lucide-react";
import type { LearnerLevel } from "../../modules/profile/types";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { TopicIllustration } from "../topics/topic-illustration";
import { createPronunciationPracticeSession, PronunciationApiError } from "./api";
import { levelLabels } from "./session-model";
import { topicDisplayName } from "../../modules/topics/display-name";

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
  const minutes = `${Math.max(1, Math.floor(Number(count) * .5))}–${Math.max(2, Math.ceil(Number(count) * .7))}`;
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
      <fieldset className="pron-setup-group" disabled={pending}>
        <legend><span className="pron-step-number" aria-hidden="true">01</span>Chọn chủ đề</legend>
        <p className="pron-setup-caption">Bắt đầu với điều bạn muốn nói mỗi ngày.</p>
        <div className="pron-topic-chips session-topic-grid">
          {topics.map((topic) => (
            <label className="pron-choice pron-topic-chip session-topic-choice" key={topic.id}>
              <input type="radio" name="pron-topic" value={topic.id} checked={topicId === topic.id} onChange={() => {
                setTopicId(topic.id); setLevel(topic.levels[0]?.level ?? "BEGINNER");
              }} />
              <span className="session-topic-card">
                <TopicIllustration className="pron-topic-thumbnail" name={topic.name} slug={topic.slug} />
                <span className="pron-topic-copy session-topic-copy"><strong>{topicDisplayName(topic.slug, topic.name)}</strong><small>{topic.totalCount} từ</small></span>
                <Check className="pron-topic-check session-topic-check" size={15} aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="pron-setup-group" disabled={pending}>
        <legend><span className="pron-step-number" aria-hidden="true">02</span>Trình độ</legend>
        <div className="pron-level-options">
          {selected?.levels.map((entry) => <label className="pron-choice pron-level-choice" key={entry.level}>
            <input type="radio" name="pron-level" value={entry.level} checked={level === entry.level} onChange={() => setLevel(entry.level)} />
            <span><strong>{levelLabels[entry.level]}</strong><small>{entry.count} từ sẵn sàng</small><Check className="pron-choice-check" size={17} aria-hidden="true" /></span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="pron-setup-group" disabled={pending}>
        <legend><span className="pron-step-number" aria-hidden="true">03</span>Số từ muốn luyện</legend>
        <div className="pron-count-options">
          {[5, 10, 15, 20].map((amount) => <button className="pron-count-pill" type="button" key={amount} disabled={pending || amount > available} aria-pressed={Number(count) === amount} onClick={() => setCount(String(amount))}>{amount}<span> từ</span></button>)}
        </div>
        <label className="pron-custom-count" htmlFor="pron-custom-count">Số khác (1–20)
          <input id="pron-custom-count" aria-describedby="pron-count-help" min={1} max={Math.min(20, available)} step={1} required disabled={pending} type="number" value={count} onChange={(event) => setCount(event.target.value)} />
        </label>
        <p className="pron-hint" id="pron-count-help">Có {available} từ sẵn sàng ở trình độ này.{Number(count) > available ? " Hãy chọn số từ nhỏ hơn." : " Mỗi từ là một lượt nghe và luyện nói."}</p>
      </fieldset>
      <div className="pron-setup-footer">
        <div className="pron-session-glance" aria-live="polite">
          <span><Clock3 size={16} aria-hidden="true" />{valid ? `${count} từ · khoảng ${minutes} phút` : "Chọn số từ phù hợp để bắt đầu"}</span>
          <p>Nghe → Thu âm → Nhận phản hồi</p>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary pron-start-button session-start-button" disabled={pending || !valid} type="submit"><Mic aria-hidden="true" size={20} />{pending ? "Đang tạo phiên…" : "Bắt đầu luyện phát âm"}<ArrowRight aria-hidden="true" size={18} /></button>
      </div>
    </form>
    <ReauthenticateDialog open={reauth} sessionId="" title="Đăng nhập lại để bắt đầu" description="Lựa chọn của bạn vẫn được giữ trên trang này." submitLabel="Đăng nhập và tiếp tục" onAuthenticated={() => { setReauth(false); void start(); }} onCancel={() => setReauth(false)} />
  </>;
}
