"use client";

import React, { useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";
import { topicDisplayName } from "../../modules/topics/display-name";
import {
  firstPendingIndex,
  getSessionProgress,
  summarizeItems,
} from "./session-model";
import { PronunciationCard } from "./pronunciation-card";
import { PronunciationSummary } from "./pronunciation-summary";
import { useT } from "../../i18n/client";

const COMPLETION_TRANSITION_MS = 480;

export function PronunciationSession({
  initial,
}: {
  initial: ClientPronunciationSession;
}) {
  const t = useT();
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => firstPendingIndex(initial.items));
  const [completing, setCompleting] = useState(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = session.items[index];
  const summary = summarizeItems(session.items);
  const progress = getSessionProgress(session.items);

  useEffect(
    () => () => {
      if (completionTimer.current !== null) {
        clearTimeout(completionTimer.current);
      }
    },
    [],
  );

  function handleSuccess(nextSession: ClientPronunciationSession) {
    setSession(nextSession);
    if (!getSessionProgress(nextSession.items).isComplete) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIndex(-1);
      return;
    }

    setCompleting(true);
    completionTimer.current = setTimeout(() => {
      completionTimer.current = null;
      setCompleting(false);
      setIndex(-1);
    }, COMPLETION_TRANSITION_MS);
  }

  if (index < 0 || !item) return <PronunciationSummary session={session} />;

  return (
    <div className="pron-session">
      <div className="pron-progress-heading">
        <div>
          <p className="eyebrow">{t.dynamic(topicDisplayName(session.topic.slug, session.topic.name))}</p>
        </div>
        <span>{t("Câu")} {index + 1}/{session.items.length}</span>
      </div>
      <div
        className="pron-progress"
        role="progressbar"
        aria-label={t("{0} trên {1} từ đã hoàn thành", progress.completedCount, progress.totalCount)}
        aria-valuemin={0}
        aria-valuemax={progress.totalCount}
        aria-valuenow={progress.completedCount}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      {completing ? (
        <section
          className="pron-completing card"
          role="status"
          aria-live="polite"
        >
          <CircleCheck aria-hidden="true" size={44} />
          <strong>{t("Đã hoàn thành")}</strong>
          <p>{t("Đang mở tổng kết…")}</p>
        </section>
      ) : (
        <PronunciationCard
          key={item.sessionItemId}
          sessionId={session.sessionId}
          item={item}
          isLast={summary.completedCount === session.items.length - 1}
          onSuccess={handleSuccess}
          onNext={() => {
            if (item.latestSuccessfulAttempt) {
              setIndex(firstPendingIndex(session.items));
            }
          }}
        />
      )}
    </div>
  );
}
