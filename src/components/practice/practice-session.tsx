"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerReview,
  ClientPracticeSession,
  GeneralResultExperience,
  PracticeResult,
  SessionQuestion,
  SessionStatus,
} from "../../modules/practice/types";
import {
  RecorderOperationGate,
  recorderTransition,
  revokePendingRecording,
  stopMediaStream,
  type RecorderOperationToken,
  type RecorderState,
} from "./recorder";
import { ReauthenticateDialog } from "./reauthenticate-dialog";
import { ResultView } from "./result-view";
import {
  AsyncRequestEpoch,
  authHeadersFor,
  nextQuestionIndexFromUpload,
  recoverGuestSession,
  retainObjectUrlIfCurrent,
  stageForSession,
  type PracticeStage,
} from "./session-model";

type PendingRecording = { blob: Blob; durationMs: number; idempotencyKey: string; url: string };

const STORAGE_KEY = "speakora-ielts-session-v1";

export function PracticeSession({
  initialSession,
  principalKind,
}: {
  initialSession: ClientPracticeSession | null;
  principalKind: "user" | "guest";
}) {
  const [session, setSession] = useState<ClientPracticeSession | null>(initialSession);
  const [stage, setStage] = useState<PracticeStage>(() => stageForSession(initialSession));
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [pendingRecording, setPendingRecording] = useState<PendingRecording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [playBlocked, setPlayBlocked] = useState(false);
  const [ttsUrl, setTtsUrl] = useState("");
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [answers, setAnswers] = useState<AnswerReview[]>([]);
  const [experience, setExperience] = useState<GeneralResultExperience | null>(null);
  const [processingFailed, setProcessingFailed] = useState(false);
  const [reauthenticate, setReauthenticate] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recorderStateRef = useRef<RecorderState>("idle");
  const recorderOperations = useRef(new RecorderOperationGate());
  const stopOperation = useRef<RecorderOperationToken | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const questionAudio = useRef<HTMLAudioElement | null>(null);
  const ttsCache = useRef(new Map<string, string>());
  const ttsEpoch = useRef(new AsyncRequestEpoch());
  const ttsAbort = useRef<AbortController | null>(null);
  const uploadAbort = useRef<AbortController | null>(null);
  const pendingRef = useRef<PendingRecording | null>(null);
  const question = session?.questions[session.currentQuestionIndex];

  const storeSession = useCallback((value: ClientPracticeSession | null) => {
    setSession(value);
    if (principalKind !== "guest") return;
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [principalKind]);

  useEffect(() => {
    if (principalKind !== "guest" || initialSession) return;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const recovered = recoverGuestSession(raw);
    if (!recovered) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    setSession(recovered);
    setStage(stageForSession(recovered));
  }, [initialSession, principalKind]);

  useEffect(() => {
    pendingRef.current = pendingRecording;
  }, [pendingRecording]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!pendingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => () => {
    recorderOperations.current.cancelAll();
    ttsEpoch.current.invalidate();
    ttsAbort.current?.abort();
    uploadAbort.current?.abort();
    stopActiveRecorder();
    if (timer.current !== null) window.clearInterval(timer.current);
    ttsCache.current.forEach((url) => URL.revokeObjectURL(url));
    revokePendingRecording(pendingRef.current);
  }, []);

  const authHeaders = useCallback((value = session) => {
    return authHeadersFor(principalKind, value?.sessionToken);
  }, [principalKind, session]);

  const loadTts = useCallback(async (
    item: SessionQuestion,
    activeSession: ClientPracticeSession,
    autoplay: boolean,
    requestToken: number,
    signal: AbortSignal,
  ) => {
    try {
      let url = ttsCache.current.get(item.sessionQuestionId);
      if (!url) {
        const response = await fetch("/api/speech/tts", {
          method: "POST",
          signal,
          headers: {
            ...authHeaders(activeSession),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: activeSession.sessionId,
            sessionQuestionId: item.sessionQuestionId,
          }),
        });
        if (!response.ok) throw new Error(await apiError(response));
        const createdUrl = URL.createObjectURL(await response.blob());
        if (!retainObjectUrlIfCurrent(ttsEpoch.current, requestToken, createdUrl)) return "";
        url = createdUrl;
        ttsCache.current.set(item.sessionQuestionId, url);
      }
      if (autoplay && ttsEpoch.current.isCurrent(requestToken)) {
        setTtsUrl(url);
        setPlayBlocked(false);
        requestAnimationFrame(() => {
          if (!ttsEpoch.current.isCurrent(requestToken)) return;
          void questionAudio.current?.play().catch(() => setPlayBlocked(true));
        });
      }
      return url;
    } catch (reason) {
      if (autoplay && ttsEpoch.current.isCurrent(requestToken) && !(reason instanceof DOMException && reason.name === "AbortError")) {
        setPlayBlocked(true);
        setError(message(reason, "Không thể phát câu hỏi."));
      }
      return "";
    }
  }, [authHeaders]);

  useEffect(() => {
    if (stage !== "practice" || !session || !question) return;
    ttsAbort.current?.abort();
    const controller = new AbortController();
    ttsAbort.current = controller;
    const requestToken = ttsEpoch.current.begin();
    void loadTts(question, session, true, requestToken, controller.signal).then(() => {
      if (!ttsEpoch.current.isCurrent(requestToken)) return;
      const next = session.questions[session.currentQuestionIndex + 1];
      if (next) void loadTts(next, session, false, requestToken, controller.signal);
    });
    return () => {
      controller.abort();
      if (ttsAbort.current === controller) ttsAbort.current = null;
      if (ttsEpoch.current.isCurrent(requestToken)) ttsEpoch.current.invalidate();
    };
  }, [loadTts, question?.sessionQuestionId, session?.currentQuestionIndex, stage]);

  async function startGuestSession() {
    setError("");
    try {
      const response = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "IELTS", questionCount: 5 }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const body = await response.json();
      const next: ClientPracticeSession = {
        sessionId: body.sessionId,
        sessionToken: body.sessionToken,
        mode: "IELTS",
        status: body.status,
        questions: body.questions,
        currentQuestionIndex: 0,
        topic: null,
      };
      storeSession(next);
      setStage("practice");
    } catch (reason) {
      setError(message(reason, "Không thể tạo phiên luyện."));
    }
  }

  async function startRecording() {
    const startingState = recorderStateRef.current;
    if (startingState !== "idle" && startingState !== "review") return;
    const operation = recorderOperations.current.begin("start");
    if (!operation) return;
    if (!question || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      recorderOperations.current.finish(operation);
      setError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }
    setError("");
    let media: MediaStream | null = null;
    let nextRecorder: MediaRecorder | null = null;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recorderOperations.current.isCurrent(operation)) {
        stopMediaStream(media);
        return;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      nextRecorder = mimeType
        ? new MediaRecorder(media, { mimeType })
        : new MediaRecorder(media);
      const recorder = nextRecorder;
      stream.current = media;
      mediaRecorder.current = recorder;
      chunks.current = [];
      startedAt.current = Date.now();
      setSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const requestedStop = stopOperation.current;
        stopOperation.current = null;
        if (requestedStop && !recorderOperations.current.finish(requestedStop)) {
          stopMediaStream(media);
          return;
        }
        if (recorderStateRef.current !== "recording") {
          stopMediaStream(media);
          return;
        }
        const durationMs = Date.now() - startedAt.current;
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        stopMediaStream(media);
        stream.current = null;
        mediaRecorder.current = null;
        if (timer.current !== null) window.clearInterval(timer.current);
        timer.current = null;
        const recording = {
          blob,
          durationMs,
          idempotencyKey: crypto.randomUUID(),
          url: URL.createObjectURL(blob),
        };
        pendingRef.current = recording;
        setPendingRecording(recording);
        moveRecorder("STOP");
      };
      recorder.start();
      if (pendingRecording) {
        revokePendingRecording(pendingRecording);
        pendingRef.current = null;
        setPendingRecording(null);
      }
      moveRecorder(startingState === "review" ? "RERECORD" : "START");
      recorderOperations.current.finish(operation);
      timer.current = window.setInterval(
        () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
        1000,
      );
    } catch (reason) {
      const currentAttempt = recorderOperations.current.finish(operation);
      if (nextRecorder) {
        nextRecorder.ondataavailable = null;
        nextRecorder.onstop = null;
        if (nextRecorder.state !== "inactive") nextRecorder.stop();
      }
      if (mediaRecorder.current === nextRecorder) mediaRecorder.current = null;
      if (stream.current === media) stream.current = null;
      stopMediaStream(media);
      if (currentAttempt) {
        setError(reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "Bạn cần cho phép truy cập microphone."
          : "Không thể bắt đầu ghi âm.");
      }
    }
  }

  function stopRecording() {
    if (recorderStateRef.current !== "recording") return;
    const activeRecorder = mediaRecorder.current;
    if (!activeRecorder || activeRecorder.state === "inactive") return;
    const operation = recorderOperations.current.begin("stop");
    if (!operation) return;
    stopOperation.current = operation;
    try {
      activeRecorder.stop();
    } catch (reason) {
      recorderOperations.current.finish(operation);
      stopOperation.current = null;
      setError(message(reason, "Không thể dừng ghi âm."));
    }
  }

  async function upload(recording = pendingRecording) {
    if (!recording || !session || !question || recorderStateRef.current !== "review") return;
    const operation = recorderOperations.current.begin("submit");
    if (!operation) return;
    moveRecorder("SUBMIT");
    setError("");
    const controller = new AbortController();
    uploadAbort.current = controller;
    try {
      const extension = recording.blob.type.includes("mp4") ? "mp4"
        : recording.blob.type.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.set("sessionQuestionId", question.sessionQuestionId);
      form.set("audio", recording.blob, `answer.${extension}`);
      form.set("durationMs", String(recording.durationMs));
      form.set("idempotencyKey", recording.idempotencyKey);
      const response = await fetch(`/api/practice/sessions/${session.sessionId}/answers`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
        signal: controller.signal,
      });
      if (response.status === 401 && principalKind === "user") {
        if (!recorderOperations.current.finish(operation)) return;
        moveRecorder("UPLOAD_FAILED");
        setError("Phiên đăng nhập đã hết hạn. Bản ghi vẫn được giữ để gửi lại.");
        setReauthenticate(true);
        return;
      }
      if (!response.ok) throw new Error(await apiError(response));
      const body: unknown = await response.json();
      const nextQuestionIndex = nextQuestionIndexFromUpload(body, session.questions.length);
      if (!recorderOperations.current.finish(operation)) return;
      moveRecorder("UPLOAD_SUCCEEDED");
      revokePendingRecording(recording);
      pendingRef.current = null;
      setPendingRecording(null);
      const next = { ...session, currentQuestionIndex: nextQuestionIndex };
      storeSession(next);
      setRecorder("idle");
      setStage(next.currentQuestionIndex >= next.questions.length ? "processing" : "practice");
    } catch (reason) {
      if (recorderOperations.current.finish(operation)) {
        moveRecorder("UPLOAD_FAILED");
        setError(message(reason, "Không thể tải bản ghi. Bạn có thể gửi lại mà không cần ghi âm lại."));
      }
    } finally {
      if (uploadAbort.current === controller) uploadAbort.current = null;
    }
  }

  const poll = useCallback(async () => {
    if (!session) return;
    try {
      const response = await fetch(`/api/practice/sessions/${session.sessionId}/status`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await apiError(response));
      const nextStatus = await response.json() as SessionStatus;
      setStatus(nextStatus);
      if (nextStatus.assessmentStatus === "COMPLETED") {
        const resultResponse = await fetch(`/api/practice/sessions/${session.sessionId}/result`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        if (resultResponse.status === 202) return;
        if (!resultResponse.ok) throw new Error(await apiError(resultResponse));
        const body = await resultResponse.json();
        setResult(body.result);
        setAnswers(body.answers ?? []);
        setExperience(body.experience ?? null);
        setStage("result");
        setProcessingFailed(false);
      } else if (nextStatus.failed > 0 || nextStatus.assessmentStatus === "FAILED") {
        setProcessingFailed(true);
        setError("Một tác vụ xử lý đã thất bại. Bạn có thể thử lại mà không cần ghi âm lại.");
      }
    } catch (reason) {
      setError(message(reason, "Không thể kiểm tra tiến trình."));
    }
  }, [authHeaders, session]);

  useEffect(() => {
    if (stage !== "processing") return;
    void poll();
    const id = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(id);
  }, [poll, stage]);

  async function retryProcessing() {
    if (!session) return;
    setError("");
    const response = await fetch(`/api/practice/sessions/${session.sessionId}/retry`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      setError(await apiError(response));
      return;
    }
    setProcessingFailed(false);
    await poll();
  }

  function resetGuestSession() {
    recorderOperations.current.cancelAll();
    uploadAbort.current?.abort();
    uploadAbort.current = null;
    ttsEpoch.current.invalidate();
    ttsAbort.current?.abort();
    ttsAbort.current = null;
    stopActiveRecorder();
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    revokePendingRecording(pendingRef.current);
    pendingRef.current = null;
    setPendingRecording(null);
    setRecorder("idle");
    setSeconds(0);
    ttsCache.current.forEach((url) => URL.revokeObjectURL(url));
    ttsCache.current.clear();
    setTtsUrl("");
    setPlayBlocked(false);
    storeSession(null);
    setResult(null);
    setAnswers([]);
    setExperience(null);
    setStatus(null);
    setError("");
    setProcessingFailed(false);
    setReauthenticate(false);
    setStage("setup");
  }

  return (
    <div className="shared-practice">
      {principalKind === "guest" && (
        <header className="topbar">
          <button className="brand" onClick={resetGuestSession} type="button">
            <span className="brand-mark" aria-hidden="true">S</span><span>Speakora</span>
          </button>
          <span className="session-pill">IELTS Speaking · 5 câu</span>
        </header>
      )}
      <section className="practice-card">
        {stage === "setup" && (
          <div className="stage stage-setup">
            <p className="eyebrow">IELTS SPEAKING</p>
            <h1>Luyện nói trọn phiên trong 5 câu</h1>
            <p className="lead">Nghe câu hỏi, thu âm, nghe lại và chỉ gửi khi bạn hài lòng.</p>
            <button className="primary large" onClick={startGuestSession}>Bắt đầu phiên luyện →</button>
          </div>
        )}
        {stage === "practice" && session && question && (
          <div className="stage centered">
            <p className="eyebrow">{questionLabel(question, session.mode)}</p>
            <p>Câu {session.currentQuestionIndex + 1}/{session.questions.length}</p>
            <div aria-label={`Tiến độ ${session.currentQuestionIndex + 1} trên ${session.questions.length}`} className="question-progress">
              <i style={{ width: `${((session.currentQuestionIndex + 1) / session.questions.length) * 100}%` }} />
            </div>
            <div className="question-panel">
              <h1>{question.promptText}</h1>
              {question.instructionText && <p>{question.instructionText}</p>}
              {question.promptItems.length > 0 && <ul>{question.promptItems.map((item) => <li key={item.sequenceNo}>{item.content}</li>)}</ul>}
            </div>
            <audio ref={questionAudio} src={ttsUrl} />
            {playBlocked && <button className="secondary" onClick={() => void questionAudio.current?.play()}>▶ Phát câu hỏi</button>}
            {recorderState === "idle" && (
              <>
                <button aria-label="Bắt đầu ghi âm" className="mic-toggle" onClick={startRecording}>🎙</button>
                <p className="hint">Nhấn microphone để bắt đầu ghi âm.</p>
              </>
            )}
            {recorderState === "recording" && (
              <>
                <p className="eyebrow recording-label"><span /> ĐANG GHI ÂM</p>
                <div aria-live="polite" className="record-time">{formatTime(seconds)}</div>
                <button aria-label="Dừng ghi âm" className="mic-toggle recording" onClick={stopRecording}>■</button>
                <p className="hint">Dừng để nghe lại trước khi gửi.</p>
              </>
            )}
            {(recorderState === "review" || recorderState === "uploading") && pendingRecording && (
              <div className="recording-review">
                <h2>Nghe lại câu trả lời</h2>
                <p>Thời lượng: {formatDuration(pendingRecording.durationMs)}</p>
                <audio className="audio-player" controls preload="metadata" src={pendingRecording.url} />
                <div className="button-row">
                  <button className="secondary" disabled={recorderState === "uploading"} onClick={startRecording}>Ghi lại</button>
                  <button className="primary" disabled={recorderState === "uploading"} onClick={() => void upload()}>
                    {recorderState === "uploading" ? "Đang gửi…" : error ? "Gửi lại bản ghi" : "Gửi câu trả lời"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {stage === "processing" && (
          <div className="stage centered processing">
            {!processingFailed && <div aria-hidden="true" className="spinner" />}
            <p className="eyebrow">ĐÃ HOÀN THÀNH 5/5</p>
            <h1>{processingFailed ? "Có sự cố khi xử lý" : "Đang xử lý câu trả lời…"}</h1>
            <p className="hint">Đã chuyển đổi {status?.completed ?? 0}/{session?.questions.length ?? 5} câu</p>
            {processingFailed && <button className="primary" onClick={retryProcessing}>Thử lại xử lý</button>}
          </div>
        )}
        {stage === "result" && result && (
          <ResultView
            answers={answers}
            experience={experience}
            guestToken={session?.sessionToken}
            onRestart={principalKind === "guest" ? resetGuestSession : undefined}
            principalKind={principalKind}
            result={result}
          />
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      <ReauthenticateDialog
        onAuthenticated={() => {
          setReauthenticate(false);
          void upload(pendingRef.current);
        }}
        onCancel={() => {
          if (window.confirm("Bản ghi chưa gửi sẽ mất nếu bạn đóng hoặc tải lại trang. Tiếp tục ở lại trang này?")) {
            setReauthenticate(false);
          }
        }}
        open={principalKind === "user" && reauthenticate}
        sessionId={session?.sessionId ?? ""}
      />
    </div>
  );

  function moveRecorder(event: Parameters<typeof recorderTransition>[1]): void {
    const next = recorderTransition(recorderStateRef.current, event);
    recorderStateRef.current = next;
    setRecorderState(next);
  }

  function setRecorder(next: RecorderState): void {
    recorderStateRef.current = next;
    setRecorderState(next);
  }

  function stopActiveRecorder(): void {
    const activeRecorder = mediaRecorder.current;
    if (activeRecorder) {
      activeRecorder.ondataavailable = null;
      activeRecorder.onstop = null;
      try {
        if (activeRecorder.state !== "inactive") activeRecorder.stop();
      } catch {
        // Tracks are still stopped below when the recorder changed state concurrently.
      }
    }
    mediaRecorder.current = null;
    stopMediaStream(stream.current);
    stream.current = null;
    stopOperation.current = null;
  }
}

async function apiError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `Yêu cầu thất bại (${response.status}).`;
}

function message(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

function formatTime(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return formatTime(seconds);
}

function questionLabel(question: SessionQuestion, mode: ClientPracticeSession["mode"]): string {
  if (mode === "GENERAL") return question.topic?.name.toLocaleUpperCase() ?? "GENERAL ENGLISH";
  if (question.questionType === "IELTS_PART_1") return "PART 1 — KHỞI ĐỘNG";
  if (question.questionType === "IELTS_PART_2_CUE_CARD") return "PART 2 — TRÌNH BÀY DÀI";
  return "PART 3 — THẢO LUẬN";
}
