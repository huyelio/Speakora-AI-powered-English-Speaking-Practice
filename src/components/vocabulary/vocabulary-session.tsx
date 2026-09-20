"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import type {
  ClientVocabularySession,
  VocabularyReviewResult,
} from "../../modules/vocabulary/types";

type Phase = "prompt" | "reveal" | "summary";

export function VocabularySession({
  initial,
}: {
  initial: ClientVocabularySession;
}) {
  const [session, setSession] = useState(initial);
  const firstPending = session.items.findIndex((item) => item.review === null);
  const [index, setIndex] = useState(firstPending >= 0 ? firstPending : 0);
  const [phase, setPhase] = useState<Phase>(
    session.status === "COMPLETED" || firstPending < 0 ? "summary" : "prompt",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<VocabularyReviewResult | null>(null);
  const [listening, setListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCacheRef = useRef(new Map<string, string>());
  const inflightRef = useRef(new Map<string, Promise<string>>());
  const playRequestRef = useRef(0);
  const sessionIdRef = useRef(session.sessionId);
  sessionIdRef.current = session.sessionId;

  /**
   * Chỉnh độ to tại đây.
   * HTMLAudioElement.volume tối đa chỉ 1.0 nên dùng Web Audio GainNode để khuếch đại.
   * 1 = bình thường, 2.5–3.5 = to hơn. Quá cao có thể rè.
   */
  const VOCAB_PLAYBACK_GAIN = 2.8;

  const current = session.items[index];
  const flipped = phase === "reveal";
  const progress = `${Math.min(index + 1, session.items.length)}/${session.items.length}`;

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }

  function prepareAmplifiedPlayback(audio: HTMLAudioElement) {
    const AudioContextCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      audio.volume = 1;
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    const context = audioContextRef.current;
    if (!gainNodeRef.current) {
      gainNodeRef.current = context.createGain();
      gainNodeRef.current.connect(context.destination);
    }
    gainNodeRef.current.gain.value = VOCAB_PLAYBACK_GAIN;
    // Fresh Audio element each play — MediaElementSource can only be created once per element.
    context.createMediaElementSource(audio).connect(gainNodeRef.current);
    return context;
  }

  useEffect(
    () => () => {
      stopAudio();
      audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioCacheRef.current.clear();
      inflightRef.current.clear();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    },
    [],
  );

  function ensureAudioUrl(sessionItemId: string): Promise<string> {
    const cached = audioCacheRef.current.get(sessionItemId);
    if (cached) return Promise.resolve(cached);

    const inflight = inflightRef.current.get(sessionItemId);
    if (inflight) return inflight;

    const request = (async () => {
      const response = await fetch(
        `/api/vocabulary/sessions/${sessionIdRef.current}/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionItemId }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Không thể phát âm.",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioCacheRef.current.set(sessionItemId, url);
      return url;
    })();

    inflightRef.current.set(sessionItemId, request);
    return request.finally(() => {
      inflightRef.current.delete(sessionItemId);
    });
  }

  async function playPronunciation(sessionItemId: string) {
    const requestId = ++playRequestRef.current;
    setListening(true);
    setError("");
    try {
      stopAudio();
      const url = await ensureAudioUrl(sessionItemId);
      if (requestId !== playRequestRef.current) return;
      const audio = new Audio(url);
      audio.preload = "auto";
      // Volume knob lives here — see VOCAB_PLAYBACK_GAIN above.
      const context = prepareAmplifiedPlayback(audio);
      audioRef.current = audio;
      if (context?.state === "suspended") await context.resume();
      await audio.play();
    } catch (reason) {
      if (requestId !== playRequestRef.current) return;
      setError(reason instanceof Error ? reason.message : "Không thể phát âm.");
    } finally {
      if (requestId === playRequestRef.current) setListening(false);
    }
  }

  // Prefetch current (+ next) while user is still guessing on the front face.
  useEffect(() => {
    if (phase === "summary") return;
    const currentItem = session.items[index];
    if (!currentItem) return;
    void ensureAudioUrl(currentItem.sessionItemId).catch(() => undefined);
    const nextItem = session.items[index + 1];
    if (nextItem)
      void ensureAudioUrl(nextItem.sessionItemId).catch(() => undefined);
  }, [phase, index, session.items]);

  function revealAnswer() {
    if (!current || flipped) return;
    setPhase("reveal");
    // Start audio near mid-flip so it feels tied to the card turn.
    window.setTimeout(() => {
      void playPronunciation(current.sessionItemId);
    }, 280);
  }

  async function submitReview(result: VocabularyReviewResult) {
    if (!current || pending || !flipped) return;
    setPending(true);
    setError("");
    setFeedback(result);
    playRequestRef.current += 1;
    stopAudio();
    try {
      const response = await fetch(
        `/api/vocabulary/sessions/${session.sessionId}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionItemId: current.sessionItemId,
            result,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Không thể lưu kết quả.",
        );
      }
      setSession(body as ClientVocabularySession);
      window.setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= session.items.length) {
          setPhase("summary");
        } else {
          // Reset to front face before the next word mounts.
          setPhase("prompt");
          setIndex(nextIndex);
        }
        setFeedback(null);
        setPending(false);
      }, 280);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu kết quả.",
      );
      setFeedback(null);
      setPending(false);
    }
  }

  if (phase === "summary" || !current) {
    return (
      <section className="vocab-summary card">
        <p className="eyebrow">HOÀN THÀNH</p>
        <h1>Tóm tắt phiên từ vựng</h1>
        <p className="lead">
          {session.topic.name} · {session.level}
        </p>
        <div className="vocab-summary-stats">
          <div>
            <strong>{session.rememberedCount}</strong>
            <span>Đã nhớ</span>
          </div>
          <div>
            <strong>{session.notRememberedCount}</strong>
            <span>Chưa nhớ</span>
          </div>
        </div>
        <div className="vocab-summary-actions">
          <Link className="primary" href="/vocabulary">
            Luyện tiếp
          </Link>
          <Link className="secondary" href={`/topics/${session.topic.slug}`}>
            Về chủ đề
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`vocab-session ${feedback ? `feedback-${feedback.toLowerCase()}` : ""}`}
    >
      <div className="vocab-progress-row">
        <p className="eyebrow">{session.topic.name}</p>
        <p className="vocab-progress-label">{progress}</p>
      </div>
      <div className="vocab-progress" aria-hidden="true">
        <div
          className="vocab-progress-fill"
          style={{
            width: `${((index + (flipped ? 0.5 : 0)) / session.items.length) * 100}%`,
          }}
        />
      </div>

      <div className="vocab-flip-scene" key={current.sessionItemId}>
        <div className={`vocab-flip-inner ${flipped ? "is-flipped" : ""}`}>
          <div
            aria-hidden={flipped}
            className="vocab-face vocab-face-front"
            onClick={revealAnswer}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                revealAnswer();
              }
            }}
            role="button"
            tabIndex={flipped ? -1 : 0}
          >
            <p className="vocab-prompt-label">Nghĩa tiếng Việt</p>
            <h1 className="vocab-meaning">{current.snapshot.meaning_vi}</h1>
            <p className="vocab-hint" aria-label="Gợi ý chữ cái đầu">
              {current.snapshot.first_letter_hint}
            </p>
            <button
              className="primary"
              onClick={(event) => {
                event.stopPropagation();
                revealAnswer();
              }}
              type="button"
            >
              Hiện đáp án
            </button>
          </div>

          <div aria-hidden={!flipped} className="vocab-face vocab-face-back">
            <h1 className="vocab-word">{current.snapshot.word}</h1>
            {current.snapshot.pronunciation_ipa && (
              <p className="vocab-ipa">{current.snapshot.pronunciation_ipa}</p>
            )}
            {current.snapshot.definition_en && (
              <p className="vocab-definition">
                {current.snapshot.definition_en}
              </p>
            )}
            <p className="vocab-meaning-repeat">
              {current.snapshot.meaning_vi}
            </p>
            <div className="vocab-example">
              <p className="eyebrow">EXAMPLE</p>
              <p>{current.snapshot.example_sentence}</p>
            </div>
            <button
              className="secondary vocab-listen"
              disabled={listening || !flipped}
              onClick={() => playPronunciation(current.sessionItemId)}
              type="button"
            >
              {listening ? "Đang phát…" : "🔊 Nghe lại"}
            </button>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="vocab-review-actions">
          <button
            className="secondary vocab-forgot"
            disabled={pending}
            onClick={() => submitReview("NOT_REMEMBERED")}
            type="button"
          >
            Chưa nhớ
          </button>
          <button
            className="primary vocab-remembered"
            disabled={pending}
            onClick={() => submitReview("REMEMBERED")}
            type="button"
          >
            Đã nhớ
          </button>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
