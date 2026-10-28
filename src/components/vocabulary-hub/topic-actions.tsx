"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { ArrowRight, AudioLines, Layers } from "lucide-react";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicAction } from "../../modules/vocabulary-learning/topic-progress";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { createPronunciationPracticeSession, PronunciationApiError } from "../pronunciation/api";
import { createVocabularyPracticeSession } from "../vocabulary/start-vocabulary-session";
import { learnMixDetail } from "./hub-model";
import { LearningApiError, learningRequest } from "../vocabulary-learning/api";

type Pending = "learn" | "cards" | "pronounce";
export type TopicActionsProps = { topicId: string; level: LearnerLevel; total: number; action: TopicAction };

/** One primary step chosen from word state, plus the two single-skill sessions as quieter options. */
export function TopicActions({ topicId, level, total, action }: TopicActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const locked = useRef(false);
  const last = useRef<Pending>("learn");
  // Reused on retry so a lost create response cannot produce a second session.
  const requestId = useRef<string | null>(null);
  const extraCount = Math.min(10, total);

  async function start(kind: Pending) {
    if (locked.current) return;
    locked.current = true; last.current = kind; setPending(kind); setError("");
    try {
      if (kind === "learn") {
        requestId.current ??= crypto.randomUUID();
        const session = await learningRequest<LearningSession>("", {
          topicId, level, requestId: requestId.current, selection: action.kind === "review-mastered" ? "MASTERED" : undefined,
        });
        router.push(`/vocabulary-learning/${session.sessionId}`);
      } else if (kind === "cards") {
        router.push(await createVocabularyPracticeSession(fetch, topicId, level, extraCount));
      } else {
        router.push(await createPronunciationPracticeSession(fetch, { topicId, level, itemCount: extraCount }));
      }
      // Stay pending until the session route replaces this page.
    } catch (reason) {
      const status = reason instanceof LearningApiError || reason instanceof PronunciationApiError ? reason.status : 0;
      if (status === 401) setReauth(true);
      setError(reason instanceof Error ? reason.message : "Không thể tạo phiên. Hãy thử lại.");
      locked.current = false; setPending(null);
    }
  }

  const busy = pending !== null;
  return (
    <div className="vt-actions">
      {action.kind === "resume" ? (
        <Link className="a5-btn vt-primary" href={`/vocabulary-learning/${action.sessionId}`}>
          Tiếp tục phiên đang học<ArrowRight aria-hidden="true" size={20} />
        </Link>
      ) : (
        <button className="a5-btn vt-primary" disabled={busy} onClick={() => void start("learn")} type="button">
          {pending === "learn" ? "Đang chuẩn bị phiên…" : action.kind === "learn" ? `Học ${action.count} từ tiếp theo` : "Ôn lại cả chủ đề"}
          <ArrowRight aria-hidden="true" size={20} />
        </button>
      )}
      <p className="vt-primary-detail">
        {action.kind === "resume" && "Bạn đang học dở chủ đề này. Tiến độ đã được lưu."}
        {action.kind === "learn" && `${learnMixDetail(action)} Làm quen → Phát âm → Nhớ từ → Ngữ cảnh.`}
        {action.kind === "review-mastered" && `Bạn đã thuộc cả ${total} từ. Ôn lại ${action.count} từ để giữ vững.`}
      </p>

      <div className="vt-more">
        <span>Hoặc luyện riêng một kỹ năng:</span>
        <button disabled={busy} onClick={() => void start("cards")} type="button">
          <Layers aria-hidden="true" size={18} />{pending === "cards" ? "Đang chuẩn bị…" : "Lật thẻ nhanh"}
        </button>
        <button disabled={busy} onClick={() => void start("pronounce")} type="button">
          <AudioLines aria-hidden="true" size={18} />{pending === "pronounce" ? "Đang chuẩn bị…" : "Chỉ luyện phát âm"}
        </button>
      </div>
      <p className="vt-note">Lật thẻ là tự chấm, nên chỉ giúp đánh dấu từ cần ôn. Để một từ thành “Đã thuộc”, hãy học trong phiên chính.</p>

      {error && <p className="error" role="alert">{error}</p>}
      <ReauthenticateDialog
        description="Lựa chọn của bạn vẫn được giữ trên trang này."
        onAuthenticated={() => { setReauth(false); void start(last.current); }}
        onCancel={() => setReauth(false)}
        open={reauth}
        sessionId=""
        submitLabel="Đăng nhập và tiếp tục"
        title="Đăng nhập lại để bắt đầu"
      />
    </div>
  );
}
