"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { deriveState } from "../../modules/vocabulary-learning/rules";
import type { TopicAction } from "../../modules/vocabulary-learning/topic-progress";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import { learnMixDetail, vocabularyTopicHref } from "../vocabulary-hub/hub-model";
import { learningRequest } from "./api";

type Next = { action: TopicAction; total: number };

/**
 * What to do after a finished session. The primary step is the same one the topic page offers
 * (up to three review words plus new words); "Chỉ ôn" retries only this session's weak words.
 */
export function SummaryNext({ session, busy, run, actionsTarget }: { session: LearningSession; busy: boolean; run(action: () => Promise<void>): Promise<void>; /** Frame slot; null until it mounts, undefined for inline buttons. */ actionsTarget?: HTMLElement | null }) {
  const router = useRouter();
  const [next, setNext] = useState<Next | null>(null);
  const [pending, setPending] = useState<"next" | "weak" | null>(null);
  // Kept across retries so a lost create response cannot produce a second session.
  const nextRequestId = useRef<string | null>(null);
  const weakRequestId = useRef<string | null>(null);
  const weak = session.items.filter(entry => deriveState(entry.evidence) === "WEAK").length;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vocabulary-learning/topics/${session.topic.id}/next?level=${session.level}`, { cache: "no-store", signal: controller.signal })
      .then(response => (response.ok ? response.json() as Promise<Next> : null))
      .then(value => { if (value) setNext(value); })
      // The button still works without the preview; the server picks the words either way.
      .catch(() => undefined);
    return () => controller.abort();
  }, [session.topic.id, session.level]);

  function start(kind: "next" | "weak") {
    setPending(kind);
    void run(async () => {
      try {
        const body = kind === "weak"
          ? { topicId: session.topic.id, level: session.level, sourceSessionId: session.sessionId, requestId: (weakRequestId.current ??= crypto.randomUUID()) }
          : { topicId: session.topic.id, level: session.level, requestId: (nextRequestId.current ??= crypto.randomUUID()), selection: next?.action.kind === "review-mastered" ? "MASTERED" : undefined };
        const created = await learningRequest<LearningSession>("", body);
        router.push(`/vocabulary-learning/${created.sessionId}`);
      } catch (error) {
        setPending(null);
        throw error;
      }
    });
  }

  const action = next?.action;
  const buttons = <>
    {weak > 0 && (
      <button className="a5-btn a5-btn-ghost" disabled={busy} onClick={() => start("weak")} type="button">
        {pending === "weak" ? "Đang chuẩn bị…" : `Chỉ ôn ${weak} từ còn yếu`}
      </button>
    )}
    {action?.kind === "resume" ? (
      <Link className="a5-btn" href={`/vocabulary-learning/${action.sessionId}`}>Tiếp tục phiên đang học<ArrowRight aria-hidden="true" size={18} /></Link>
    ) : (
      <button className="a5-btn" disabled={busy} onClick={() => start("next")} type="button">
        {pending === "next" ? "Đang chuẩn bị phiên…" : action?.kind === "review-mastered" ? "Ôn lại cả chủ đề" : action?.kind === "learn" ? `Học tiếp ${action.count} từ` : "Học tiếp"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    )}
  </>;
  return (
    <div className="vl-next">
      <p className="vl-next-note">
        {weak > 0 && `${weak} từ cần ôn sẽ được ưu tiên ở phiên sau. `}
        Một từ thành “Đã thuộc” khi bạn nhớ đúng ở 2 phiên khác nhau và phát âm tốt.
      </p>
      {actionsTarget === undefined ? <div className="vl-actions">{buttons}</div> : actionsTarget && createPortal(buttons, actionsTarget)}
      {action?.kind === "learn" && <p className="vl-next-detail">{learnMixDetail(action)}</p>}
      <p className="vl-next-links">
        <Link href={vocabularyTopicHref(session.topic.slug)}>Về chủ đề</Link>
        <span aria-hidden="true">·</span>
        <Link href="/dashboard">Về trang chủ</Link>
      </p>
    </div>
  );
}
