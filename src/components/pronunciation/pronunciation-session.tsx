"use client";

import React, { useState } from "react";
import type { ClientPronunciationSession } from "../../modules/pronunciation-practice/types";
import { firstPendingIndex, levelLabels, summarizeItems } from "./session-model";
import { PronunciationCard } from "./pronunciation-card";
import { PronunciationSummary } from "./pronunciation-summary";

export function PronunciationSession({ initial }: { initial: ClientPronunciationSession }) {
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => firstPendingIndex(initial.items));
  const item = session.items[index];
  const summary = summarizeItems(session.items);
  if (index < 0 || !item) return <PronunciationSummary session={session} />;
  return <div className="pron-session">
    <div className="pron-progress-heading"><div><p className="eyebrow">{session.topic.name}</p><p>{levelLabels[session.level]}</p></div><span>Từ {index + 1}/{session.items.length}</span></div>
    <progress aria-label={`${summary.completedCount} trên ${session.items.length} từ đã hoàn thành`} max={session.items.length} value={summary.completedCount} />
    <PronunciationCard key={item.sessionItemId} sessionId={session.sessionId} item={item} isLast={firstPendingIndex(session.items) < 0 || summary.completedCount === session.items.length - 1}
      onSuccess={setSession} onNext={() => { if (item.latestSuccessfulAttempt) setIndex(firstPendingIndex(session.items)); }} />
  </div>;
}
