"use client";
import React, { useEffect, useRef, useState } from "react";
import type { LearningItem } from "../../modules/vocabulary-learning/types";

export function LearnWord({ item, sessionId, busy, onNext }: { item: LearningItem; sessionId: string; busy: boolean; onNext(): void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);
  async function listen() {
    if (listening) return;
    setListening(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      if (!url.current) {
        const response = await fetch(`/api/vocabulary/sessions/${sessionId}/tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionItemId: item.sessionItemId }), signal: controller.signal });
        if (!response.ok) throw new Error("Không thể phát âm mẫu. Hãy thử lại.");
        const blob = await response.blob(); if (controller.signal.aborted) return;
        url.current = URL.createObjectURL(blob);
      }
      const playback = new Audio(url.current); audio.current = playback;
      playback.onended = () => setListening(false);
      playback.onerror = () => { setListening(false); setError("Không thể phát âm mẫu. Hãy thử lại."); };
      await playback.play();
    } catch (reason) { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Hãy thử nghe lại."); setListening(false); } }
  }
  return <section className="card vl-word"><p className="eyebrow">LÀM QUEN VỚI TỪ</p><h2 lang="en">{item.snapshot.word}</h2><p className="pron-ipa">{item.snapshot.pronunciation_ipa}</p><p className="pron-meaning">{item.snapshot.meaning_vi}</p>{item.snapshot.definition_en && <p lang="en">{item.snapshot.definition_en}</p>}<blockquote lang="en">{item.snapshot.example_sentence}</blockquote><div className="vl-actions"><button className="secondary" disabled={listening} onClick={() => void listen()}>{listening ? "Đang phát…" : "Nghe phát âm mẫu"}</button><button className="primary" disabled={busy} onClick={onNext}>{busy ? "Đang lưu…" : "Tiếp tục"}</button></div>{error && <p role="alert" className="error">{error}</p>}</section>;
}
