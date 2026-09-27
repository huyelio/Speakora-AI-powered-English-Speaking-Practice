"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import type { ClientPronunciationSession, PronunciationSessionItem } from "../../modules/pronunciation-practice/types";
import { boostMediaElement } from "../audio/boosted-playback";
import { useAudioRecorder } from "../audio/use-audio-recorder";
import { ReauthenticateDialog } from "../practice/reauthenticate-dialog";
import { loadPronunciationSession, PronunciationApiError, readAttemptResponse, responseError } from "./api";
import { ScoreRing } from "./score-ring";
import { SyllableWord } from "./syllable-word";

const micMessages = {
  MIC_DENIED: "Chưa có quyền dùng micro. Mở quyền truy cập của trang trên thanh địa chỉ, cho phép micro rồi thử lại.",
  UNSUPPORTED: "Trình duyệt chưa hỗ trợ ghi âm ở định dạng phù hợp. Hãy dùng Chrome, Safari hoặc Firefox mới trên HTTPS hoặc localhost.",
  EMPTY_RECORDING: "Bản ghi chưa có âm thanh. Kiểm tra micro và ghi lại.",
  RECORDING_FAILED: "Không thể ghi âm. Kiểm tra micro có đang được ứng dụng khác sử dụng rồi thử lại.",
};
type Action = "upload" | "retry" | "check";

export function PronunciationCard({ sessionId, item, isLast, onSuccess, onNext }: {
  sessionId: string; item: PronunciationSessionItem; isLast: boolean;
  onSuccess(session: ClientPronunciationSession): void; onNext(): void;
}) {
  const recorder = useAudioRecorder();
  const [feedback, setFeedback] = useState(item.latestSuccessfulAttempt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stored, setStored] = useState<{ id: string; status?: string } | null>(null);
  const [reauth, setReauth] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const releaseAudioBoost = useRef<(() => void) | null>(null);
  const localAudio = useRef<HTMLAudioElement | null>(null);
  const ttsUrl = useRef<string | null>(null);
  const ttsRequest = useRef<AbortController | null>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const listeningLock = useRef(false);
  const mounted = useRef(true);
  const repeatAfterAuth = useRef<() => void>(() => {});
  const card = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    card.current?.querySelector<HTMLElement>("h1")?.focus();
    return () => {
      mounted.current = false; request.current?.abort(); ttsRequest.current?.abort();
      audio.current?.pause(); localAudio.current?.pause();
      releaseAudioBoost.current?.(); releaseAudioBoost.current = null;
      if (ttsUrl.current) URL.revokeObjectURL(ttsUrl.current);
      ttsUrl.current = null;
    };
  }, []);

  async function listen() {
    if (listeningLock.current || busy || ["requesting", "recording", "stopping"].includes(recorder.state)) return;
    listeningLock.current = true; setListening(true); setTtsError(""); localAudio.current?.pause();
    const controller = new AbortController(); ttsRequest.current = controller;
    try {
      if (!ttsUrl.current) {
        const response = await fetch(`/api/pronunciation/sessions/${sessionId}/tts`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionItemId: item.sessionItemId }), signal: controller.signal,
        });
        if (!response.ok) throw await responseError(response);
        const blob = await response.blob();
        if (!mounted.current || controller.signal.aborted) return;
        ttsUrl.current = URL.createObjectURL(blob);
      }
      audio.current?.pause();
      releaseAudioBoost.current?.(); releaseAudioBoost.current = null;
      const playback = new Audio(ttsUrl.current); audio.current = playback;
      releaseAudioBoost.current = boostMediaElement(playback);
      playback.onended = () => { releaseAudioBoost.current?.(); releaseAudioBoost.current = null; listeningLock.current = false; if (mounted.current) setListening(false); };
      playback.onerror = () => { releaseAudioBoost.current?.(); releaseAudioBoost.current = null; listeningLock.current = false; if (mounted.current) { setListening(false); setTtsError("Không thể phát mẫu. Hãy thử nghe lại."); } };
      await playback.play();
    } catch (reason) {
      if (!mounted.current || controller.signal.aborted) return;
      listeningLock.current = false; setListening(false);
      setTtsError("Không thể phát mẫu. Hãy thử nghe lại.");
      if (reason instanceof PronunciationApiError && reason.status === 401) {
        repeatAfterAuth.current = () => { void listen(); }; setReauth(true);
      }
    }
  }

  async function submit(action: Action) {
    if (locked.current || (action === "upload" && !recorder.recording) || (action !== "upload" && !stored)) return;
    locked.current = true; setBusy(true); setError(""); audio.current?.pause(); localAudio.current?.pause();
    releaseAudioBoost.current?.(); releaseAudioBoost.current = null;
    listeningLock.current = false; setListening(false);
    const controller = new AbortController(); request.current = controller;
    try {
      let attemptId = stored?.id;
      if (action !== "check") {
        let response: Response;
        if (action === "retry") {
          response = await fetch(`/api/pronunciation/attempts/${stored!.id}/retry`, { method: "POST", signal: controller.signal });
        } else {
          const recording = recorder.recording!;
          const form = new FormData();
          const extension = recording.blob.type.includes("mp4") ? "mp4" : recording.blob.type.includes("ogg") ? "ogg" : "webm";
          form.set("audio", recording.blob, `word.${extension}`);
          form.set("sessionItemId", item.sessionItemId);
          form.set("durationMs", String(recording.durationMs));
          form.set("idempotencyKey", recording.idempotencyKey);
          response = await fetch(`/api/pronunciation/sessions/${sessionId}/attempts`, { method: "POST", body: form, signal: controller.signal });
        }
        attemptId = await readAttemptResponse(response);
        if (mounted.current) setStored({ id: attemptId, status: "COMPLETED" });
      }
      const session = await loadPronunciationSession(sessionId, controller.signal);
      if (!mounted.current) return;
      const latest = session.items.find((entry) => entry.sessionItemId === item.sessionItemId)?.latestSuccessfulAttempt;
      if (!latest || latest.attemptId !== attemptId) throw new Error("Chưa có kết quả cho bản ghi này. Hãy kiểm tra lại sau; bản ghi vẫn được giữ.");
      setFeedback(latest); setStored(null); onSuccess(session);
    } catch (reason) {
      if (!mounted.current || controller.signal.aborted) return;
      if (reason instanceof PronunciationApiError) {
        if (reason.attemptId) setStored({ id: reason.attemptId, status: reason.attemptStatus });
        if (reason.status === 401) { repeatAfterAuth.current = () => { void submit(action); }; setReauth(true); }
      }
      setError(reason instanceof Error ? reason.message : "Không thể gửi bản ghi. Hãy kiểm tra kết nối và thử lại.");
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }

  async function record() {
    audio.current?.pause(); localAudio.current?.pause(); ttsRequest.current?.abort();
    releaseAudioBoost.current?.(); releaseAudioBoost.current = null;
    listeningLock.current = false; setListening(false); setError(""); setFeedback(null); setStored(null);
    await recorder.start();
  }

  const capturing = ["requesting", "recording", "stopping"].includes(recorder.state);
  const seconds = Math.floor(recorder.elapsedMs / 1000);
  const syllables = feedback?.result.words.flatMap((word) => word.syllables) ?? [];
  return <section className="pron-card card" ref={card} aria-label="Luyện phát âm một từ">
    <p className="eyebrow">NGHE · NÓI · CẢI THIỆN</p>
    <SyllableWord word={item.snapshot.word} syllables={syllables} />
    <p className="pron-ipa" lang="en">{item.snapshot.pronunciationIpa}</p>
    <p className="pron-meaning">{item.snapshot.meaningVi}</p>
    <button className="secondary pron-listen" disabled={listening || capturing || busy} onClick={() => { void listen(); }} type="button"><Volume2 aria-hidden="true" size={22} />{listening ? "Đang phát mẫu…" : ttsError ? "Thử nghe mẫu lại" : "Nghe phát âm mẫu"}</button>
    {ttsError && <p className="error" role="alert">{ttsError}</p>}
    <div className="pron-record-area">
      {recorder.state === "recording" ? <>
        <button className="pron-mic is-recording" onClick={recorder.stop} type="button" aria-label="Dừng ghi âm"><Square aria-hidden="true" size={28} /></button>
        <p role="status">Đang ghi âm <span className="pron-timer">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span></p>
      </> : <>
        <button className="pron-mic" disabled={busy || capturing || listening} onClick={() => { void record(); }} type="button" aria-label={recorder.recording || feedback ? "Ghi âm lại" : "Bắt đầu ghi âm"}><Mic aria-hidden="true" size={30} /></button>
        <p role="status">{recorder.state === "requesting" ? "Đang chờ quyền truy cập micro…" : recorder.state === "stopping" ? "Đang lưu bản ghi…" : recorder.recording || feedback ? "Ghi âm lại để thử thêm một lần" : "Nhấn micro và đọc từ phía trên"}</p>
      </>}
      <p className="pron-hint">Một từ, nói rõ và tự nhiên · Tối đa 60 giây</p>
      {recorder.error && <p className="error" role="alert">{micMessages[recorder.error]}</p>}
    </div>
    {recorder.recording && <div className="pron-local-audio"><label htmlFor="pron-local-playback">Nghe lại bản ghi của bạn</label><audio controls id="pron-local-playback" ref={localAudio} src={recorder.recording.url} onPlay={() => { audio.current?.pause(); listeningLock.current = false; setListening(false); }} /></div>}
    <div className="pron-scoring" aria-busy={busy} aria-live="polite">
      {busy ? <div className="pron-processing"><LoaderCircle className="pron-spinner" aria-hidden="true" size={28} /><strong>Đang chấm phát âm…</strong><p>Bản ghi đang được xử lý, hãy giữ trang này mở.</p></div>
        : feedback ? <><ScoreRing score={feedback.score} /><p><Check aria-hidden="true" size={18} /> Đã lưu kết quả. Bạn có thể luyện lại hoặc tiếp tục.</p></>
          : <p className="pron-hint">Điểm phát âm và phản hồi theo âm tiết sẽ xuất hiện sau khi gửi.</p>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="pron-actions">
      {!feedback && recorder.recording && !stored && <button className="primary" disabled={busy || capturing} onClick={() => { void submit("upload"); }} type="button">{busy ? "Đang gửi…" : error ? "Gửi lại bản ghi" : "Chấm phát âm"}</button>}
      {stored && <>
        <button className="secondary" disabled={busy} onClick={() => { void submit("check"); }} type="button">Kiểm tra kết quả</button>
        {stored.status !== "COMPLETED" && <button className="primary" disabled={busy || (stored.status === "UPLOADED" && !recorder.recording)} onClick={() => { void submit(stored.status === "UPLOADED" ? "upload" : "retry"); }} type="button"><RotateCcw aria-hidden="true" size={18} />{stored.status === "UPLOADED" ? "Gửi lại bản ghi" : "Chấm lại bản ghi đã lưu"}</button>}
      </>}
      {feedback && <button className="primary" disabled={busy || capturing} onClick={onNext} type="button">{isLast ? "Xem tổng kết" : "Từ tiếp theo"}<ArrowRight aria-hidden="true" size={18} /></button>}
    </div>
    {feedback && <p className="pron-band-legend"><span className="band-good">Tốt ≥85</span><span className="band-practice">Cần luyện thêm 70–84</span><span className="band-weak">Cần cải thiện &lt;70</span></p>}
    <ReauthenticateDialog open={reauth} sessionId={sessionId} onAuthenticated={() => { setReauth(false); repeatAfterAuth.current(); }} onCancel={() => setReauth(false)} />
  </section>;
}
