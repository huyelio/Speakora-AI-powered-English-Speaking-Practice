"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Volume2 } from "lucide-react";
import type { LearningItem } from "../../modules/vocabulary-learning/types";
import { TTS_RETRY_LABEL } from "../audio/tts-client";

/**
 * Audio blobs belong to the session (`loadAudio`), so the next word can be fetched ahead and reused.
 * Buttons render into the session's fixed action bar (`actionsTarget`) so they never scroll away.
 */
export function LearnWord({ item, busy, count, actionsTarget, loadAudio, onPlayed, onNext }: { item: LearningItem; busy: boolean; count: string; /** Frame slot; null until it mounts, omit for inline buttons. */ actionsTarget?: HTMLElement | null; loadAudio(sessionItemId: string): Promise<string>; onPlayed(): void; onNext(): void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const alive = useRef(true);
  // Set in the body too: Strict Mode runs cleanup then remounts, and a cleanup-only effect would leave this false.
  useEffect(() => { alive.current = true; return () => { alive.current = false; audio.current?.pause(); }; }, []);
  async function listen() {
    if (listening) return;
    setListening(true); setError("");
    try {
      const url = await loadAudio(item.sessionItemId);
      if (!alive.current) return;
      const playback = new Audio(url); audio.current = playback;
      playback.onended = () => setListening(false);
      playback.onerror = () => { setListening(false); setError(`Không thể phát âm mẫu. Hãy bấm ${TTS_RETRY_LABEL}.`); };
      await playback.play();
      onPlayed();
    } catch (reason) { if (alive.current) { setError(reason instanceof Error ? reason.message : "Hãy thử nghe lại."); setListening(false); } }
  }
  const actions = <>
    <button className="a5-btn a5-btn-ghost" disabled={listening} onClick={() => void listen()} type="button"><Volume2 aria-hidden="true" size={18} />{listening ? "Đang phát…" : error ? TTS_RETRY_LABEL : "Nghe phát âm mẫu"}</button>
    <button className="a5-btn" disabled={busy} onClick={onNext} type="button">{busy ? "Đang lưu…" : "Tiếp tục"}<ArrowRight aria-hidden="true" size={18} /></button>
  </>;
  return <section className="card vl-word">
    <p className="vl-count" role="status">{count}</p>
    <h2 lang="en">{item.snapshot.word}</h2>
    <p className="pron-ipa">{item.snapshot.pronunciation_ipa}</p>
    <p className="pron-meaning">{item.snapshot.meaning_vi}</p>
    {item.snapshot.definition_en && <p lang="en">{item.snapshot.definition_en}</p>}
    <blockquote lang="en">{item.snapshot.example_sentence}</blockquote>
    {error && <p role="alert" className="error">{error}</p>}
    {actionsTarget === undefined ? <div className="vl-actions">{actions}</div> : actionsTarget && createPortal(actions, actionsTarget)}
  </section>;
}
