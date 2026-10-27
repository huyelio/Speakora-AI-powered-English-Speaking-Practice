"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Mic, Square, Volume2, X } from "lucide-react";
import type {
  AnswerReview,
  ClientPracticeSession,
  GeneralResultExperience,
  PracticeResult,
  SessionQuestion,
  SessionStatus,
} from "../../modules/practice/types";
import { PracticeAvatar } from "./practice-avatar";
import { IeltsExaminer, IeltsFlow, IeltsSessionInfo } from "./ielts-presentation";
import "./ielts-practice.css";
import {
  isBrowserSpeechSupported,
  startBrowserSpeech,
  type BrowserSpeechHandle,
} from "./browser-speech";
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
import { Brand } from "../ui/brand";
import {
  AsyncRequestEpoch,
  authHeadersFor,
  avatarStateFor,
  nextQuestionIndexFromUpload,
  recoverGuestSession,
  retainObjectUrlIfCurrent,
  stageForSession,
  type PracticeStage,
} from "./session-model";

type PendingRecording = {
  blob: Blob;
  durationMs: number;
  idempotencyKey: string;
  url: string;
};

const STORAGE_KEY = "speakora-ielts-session-v1";

export function PracticeSession({
  initialSession,
  principalKind,
  onExit,
  onQuickCheckComplete,
  completionPending = false,
}: {
  initialSession: ClientPracticeSession | null;
  principalKind: "user" | "guest";
  onExit?: () => void;
  onQuickCheckComplete?: (sessionId: string) => void;
  completionPending?: boolean;
}) {
  const [session, setSession] = useState<ClientPracticeSession | null>(
    initialSession,
  );
  const [stage, setStage] = useState<PracticeStage>(() =>
    stageForSession(initialSession),
  );
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [pendingRecording, setPendingRecording] =
    useState<PendingRecording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [playBlocked, setPlayBlocked] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [ttsUrl, setTtsUrl] = useState("");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [answers, setAnswers] = useState<AnswerReview[]>([]);
  const [experience, setExperience] = useState<GeneralResultExperience | null>(
    null,
  );
  const [processingFailed, setProcessingFailed] = useState(false);
  const [reauthenticate, setReauthenticate] = useState(false);
  const [browserTranscript, setBrowserTranscript] = useState("");
  const [browserSpeechAvailable, setBrowserSpeechAvailable] = useState(false);
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
  const browserSpeechRef = useRef<BrowserSpeechHandle | null>(null);
  const question = session?.questions[session.currentQuestionIndex];
  const isTopicMode = session?.mode === "GENERAL";
  const isIelts = !session || session.mode === "IELTS";

  const storeSession = useCallback(
    (value: ClientPracticeSession | null) => {
      setSession(value);
      if (principalKind !== "guest") return;
      if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(STORAGE_KEY);
    },
    [principalKind],
  );

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

  useEffect(() => {
    setBrowserSpeechAvailable(isBrowserSpeechSupported());
  }, []);

  useEffect(
    () => () => {
      recorderOperations.current.cancelAll();
      ttsEpoch.current.invalidate();
      ttsAbort.current?.abort();
      uploadAbort.current?.abort();
      browserSpeechRef.current?.abort();
      browserSpeechRef.current = null;
      stopActiveRecorder();
      if (timer.current !== null) window.clearInterval(timer.current);
      ttsCache.current.forEach((url) => URL.revokeObjectURL(url));
      revokePendingRecording(pendingRef.current);
    },
    [],
  );

  const authHeaders = useCallback(
    (value = session) => {
      return authHeadersFor(principalKind, value?.sessionToken);
    },
    [principalKind, session],
  );

  const loadTts = useCallback(
    async (
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
          if (
            !retainObjectUrlIfCurrent(
              ttsEpoch.current,
              requestToken,
              createdUrl,
            )
          )
            return "";
          url = createdUrl;
          ttsCache.current.set(item.sessionQuestionId, url);
        }
        if (autoplay && ttsEpoch.current.isCurrent(requestToken)) {
          setTtsUrl(url);
          setPlayBlocked(false);
          requestAnimationFrame(() => {
            if (!ttsEpoch.current.isCurrent(requestToken)) return;
            void questionAudio.current
              ?.play()
              .catch(() => setPlayBlocked(true));
          });
        }
        return url;
      } catch (reason) {
        if (
          autoplay &&
          ttsEpoch.current.isCurrent(requestToken) &&
          !(reason instanceof DOMException && reason.name === "AbortError")
        ) {
          setPlayBlocked(true);
          setError(message(reason, "Không thể phát câu hỏi."));
        }
        return "";
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    if (stage !== "practice" || !session || !question) return;
    ttsAbort.current?.abort();
    const controller = new AbortController();
    ttsAbort.current = controller;
    const requestToken = ttsEpoch.current.begin();
    void loadTts(question, session, true, requestToken, controller.signal).then(
      () => {
        if (!ttsEpoch.current.isCurrent(requestToken)) return;
        const next = session.questions[session.currentQuestionIndex + 1];
        if (next)
          void loadTts(next, session, false, requestToken, controller.signal);
      },
    );
    return () => {
      controller.abort();
      if (ttsAbort.current === controller) ttsAbort.current = null;
      if (ttsEpoch.current.isCurrent(requestToken))
        ttsEpoch.current.invalidate();
    };
  }, [
    loadTts,
    question?.sessionQuestionId,
    session?.currentQuestionIndex,
    stage,
  ]);

  async function startGuestSession() {
    if (startingSession) return;
    setStartingSession(true);
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
    } finally {
      setStartingSession(false);
    }
  }

  async function startRecording() {
    const startingState = recorderStateRef.current;
    if (startingState !== "idle" && startingState !== "review") return;
    const operation = recorderOperations.current.begin("start");
    if (!operation) return;
    if (
      !question ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      recorderOperations.current.finish(operation);
      setError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }
    setError("");
    setBrowserTranscript("");
    let media: MediaStream | null = null;
    let nextRecorder: MediaRecorder | null = null;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recorderOperations.current.isCurrent(operation)) {
        stopMediaStream(media);
        return;
      }
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
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
        if (
          requestedStop &&
          !recorderOperations.current.finish(requestedStop)
        ) {
          stopMediaStream(media);
          return;
        }
        if (recorderStateRef.current !== "recording") {
          stopMediaStream(media);
          return;
        }
        const durationMs = Date.now() - startedAt.current;
        const blob = new Blob(chunks.current, {
          type: recorder.mimeType || "audio/webm",
        });
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
      browserSpeechRef.current?.abort();
      browserSpeechRef.current = isTopicMode
        ? startBrowserSpeech("en-US")
        : null;
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
        setError(
          reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Bạn cần cho phép truy cập microphone."
            : "Không thể bắt đầu ghi âm.",
        );
      }
    }
  }

  async function stopRecording() {
    if (recorderStateRef.current !== "recording") return;
    const activeRecorder = mediaRecorder.current;
    if (!activeRecorder || activeRecorder.state === "inactive") return;
    const operation = recorderOperations.current.begin("stop");
    if (!operation) return;
    stopOperation.current = operation;

    const speech = browserSpeechRef.current;
    browserSpeechRef.current = null;
    if (speech) {
      try {
        const draft = await speech.stop();
        setBrowserTranscript(draft);
      } catch {
        setBrowserTranscript("");
      }
    }

    try {
      activeRecorder.stop();
    } catch (reason) {
      recorderOperations.current.finish(operation);
      stopOperation.current = null;
      setError(message(reason, "Không thể dừng ghi âm."));
    }
  }

  async function upload(recording = pendingRecording) {
    if (
      !recording ||
      !session ||
      !question ||
      recorderStateRef.current !== "review"
    )
      return;
    const operation = recorderOperations.current.begin("submit");
    if (!operation) return;
    moveRecorder("SUBMIT");
    setError("");
    const controller = new AbortController();
    uploadAbort.current = controller;
    try {
      const extension = recording.blob.type.includes("mp4")
        ? "mp4"
        : recording.blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const form = new FormData();
      form.set("sessionQuestionId", question.sessionQuestionId);
      form.set("audio", recording.blob, `answer.${extension}`);
      form.set("durationMs", String(recording.durationMs));
      form.set("idempotencyKey", recording.idempotencyKey);
      const response = await fetch(
        `/api/practice/sessions/${session.sessionId}/answers`,
        {
          method: "POST",
          headers: authHeaders(),
          body: form,
          signal: controller.signal,
        },
      );
      if (response.status === 401 && principalKind === "user") {
        if (!recorderOperations.current.finish(operation)) return;
        moveRecorder("UPLOAD_FAILED");
        setError(
          "Phiên đăng nhập đã hết hạn. Bản ghi vẫn được giữ để gửi lại.",
        );
        setReauthenticate(true);
        return;
      }
      if (!response.ok) throw new Error(await apiError(response));
      const body: unknown = await response.json();
      const nextQuestionIndex = nextQuestionIndexFromUpload(
        body,
        session.questions.length,
      );
      if (!recorderOperations.current.finish(operation)) return;
      moveRecorder("UPLOAD_SUCCEEDED");
      revokePendingRecording(recording);
      pendingRef.current = null;
      setPendingRecording(null);
      const next = { ...session, currentQuestionIndex: nextQuestionIndex };
      storeSession(next);
      setBrowserTranscript("");
      setRecorder("idle");
      setStage(
        next.currentQuestionIndex >= next.questions.length
          ? "processing"
          : "practice",
      );
    } catch (reason) {
      if (recorderOperations.current.finish(operation)) {
        moveRecorder("UPLOAD_FAILED");
        setError(
          message(
            reason,
            "Không thể tải bản ghi. Bạn có thể gửi lại mà không cần ghi âm lại.",
          ),
        );
      }
    } finally {
      if (uploadAbort.current === controller) uploadAbort.current = null;
    }
  }

  const poll = useCallback(async () => {
    if (!session) return;
    try {
      const response = await fetch(
        `/api/practice/sessions/${session.sessionId}/status`,
        {
          headers: authHeaders(),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const nextStatus = (await response.json()) as SessionStatus;
      setStatus(nextStatus);
      if (nextStatus.assessmentStatus === "COMPLETED") {
        const resultResponse = await fetch(
          `/api/practice/sessions/${session.sessionId}/result`,
          {
            headers: authHeaders(),
            cache: "no-store",
          },
        );
        if (resultResponse.status === 202) return;
        if (!resultResponse.ok) throw new Error(await apiError(resultResponse));
        const body = await resultResponse.json();
        setResult(body.result);
        setAnswers(body.answers ?? []);
        setExperience(body.experience ?? null);
        setStage("result");
        setProcessingFailed(false);
      } else if (
        nextStatus.failed > 0 ||
        nextStatus.assessmentStatus === "FAILED"
      ) {
        setProcessingFailed(true);
        setError(
          "Một tác vụ xử lý đã thất bại. Bạn có thể thử lại mà không cần ghi âm lại.",
        );
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
    const response = await fetch(
      `/api/practice/sessions/${session.sessionId}/retry`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    );
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
    browserSpeechRef.current?.abort();
    browserSpeechRef.current = null;
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
    setTtsPlaying(false);
    setPlayBlocked(false);
    setBrowserTranscript("");
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

  /* ── Derived avatar state ─────────────────────────────────────────────── */

  const avatarState = avatarStateFor({
    stage,
    recorderState,
    ttsPlaying,
  });

  /* ── Progress values ──────────────────────────────────────────────────── */

  const totalQuestions = session?.questions.length ?? 5;
  const currentIndex = session?.currentQuestionIndex ?? 0;
  const progressPct =
    stage === "processing" || stage === "result"
      ? 100
      : stage === "practice"
        ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
        : 0;

  /* ── Topbar title ─────────────────────────────────────────────────────── */

  const topbarTitle =
    session?.sessionKind === "QUICK_CHECK" ? "Quick Speaking Check" : stage === "setup"
      ? "IELTS Speaking"
      : stage === "result"
        ? "Kết quả"
        : stage === "processing"
          ? "Đang xử lý…"
          : session?.mode === "GENERAL" && question
            ? (question.topic?.name ?? "General English")
            : "IELTS Speaking";

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className={`ps-shell ps-shell--${stage}${isIelts ? " ielts-shell" : ""}`}>
      {/* Hidden audio element for TTS */}
      <audio
        onEnded={() => setTtsPlaying(false)}
        onPause={() => setTtsPlaying(false)}
        onPlay={() => {
          setPlayBlocked(false);
          setTtsPlaying(true);
        }}
        ref={questionAudio}
        src={ttsUrl || undefined}
        style={{ display: "none" }}
      />

      {/* ── Topbar ── */}
      <header className="ps-topbar">
        {principalKind === "guest" && <Brand compact />}
        <button
          aria-label="Thoát phiên luyện"
          className="ps-topbar-close"
          onClick={onExit ?? (principalKind === "guest" ? resetGuestSession : isIelts ? () => window.location.assign("/dashboard") : undefined)}
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <span className="ps-topbar-title">{topbarTitle}</span>
        <div className="ps-topbar-actions">
        {stage === "practice" && session && (
          <span className="ps-topbar-pill">
            {currentIndex + 1}/{totalQuestions}
          </span>
        )}
        {stage !== "practice" && (
          <span className="ps-topbar-pill" style={{ visibility: "hidden" }}>
            —
          </span>
        )}
        </div>
      </header>

      <div className="ps-page-heading">
        <div>
          <p className="eyebrow">LUYỆN NÓI TIẾNG ANH</p>
          <h1>{topbarTitle}</h1>
          <p className="ps-page-lead">Nghe, luyện nói và tiến bộ qua từng câu trả lời.</p>
        </div>
        <div className="ps-goal" hidden={isIelts}>
          <div className="ps-goal-label">
            <span>Tiến độ phiên luyện</span>
            <strong>{stage === "practice" ? currentIndex + 1 : stage === "setup" ? 0 : totalQuestions}/{totalQuestions}</strong>
          </div>
      {/* ── Progress bar ── */}
      <div
        aria-label={`Tiến độ ${progressPct}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progressPct}
        className="ps-progress"
        role="progressbar"
      >
        <div
          className="ps-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
        </div>
      </div>

      <div className={`ps-workspace ps-workspace--${stage}`}>
      <section className="ps-card">
        {/* SETUP */}
        {stage === "setup" && (
          <div className="ps-stage ps-setup">
            {isIelts && <IeltsExaminer state="idle" />}
            <p className="ps-setup-eyebrow">Luyện thi IELTS</p>
            <h2 className="ps-setup-title">Luyện nói trọn phiên trong 5 câu</h2>
            <p className="ps-setup-lead">
              Nghe câu hỏi, thu âm, nghe lại và chỉ gửi khi bạn hài lòng.
            </p>
            <button
              className="ps-btn ps-btn--primary ps-setup-cta"
              onClick={startGuestSession}
              disabled={startingSession}
              aria-busy={startingSession}
              type="button"
            >
              {startingSession ? "Đang chuẩn bị…" : "Bắt đầu phiên luyện →"}
            </button>
          </div>
        )}

        {/* PRACTICE */}
        {stage === "practice" && session && question && (
          <div className={`ps-stage${isIelts ? " ielts-practice-stage" : ""}`}>
            {isIelts && <IeltsExaminer state={recorderState === "uploading" ? "thinking" : avatarState} />}
            {/* Card header */}
            <div className="ps-card-header">
              <span
                className={`ps-tag${recorderState === "recording" ? " ps-tag--recording" : ""}`}
              >
                {questionLabel(question, session.mode)}
              </span>
              <span className="ps-counter">
                Câu {currentIndex + 1}/{totalQuestions}
              </span>
            </div>

            {/* Question content */}
            <div className="ps-question">
              <h2 className="ps-question-prompt" lang="en">{question.promptText}</h2>
              {question.instructionText && (
                <p className="ps-question-sub">{question.instructionText}</p>
              )}
              {question.promptItems.length > 0 && (
                <ul className="ps-question-list">
                  {question.promptItems.map((item) => (
                    <li key={item.sequenceNo}>{item.content}</li>
                  ))}
                </ul>
              )}

              {/* TTS icon row */}
              <div className="ps-icon-row">
                <button
                  aria-label="Phát câu hỏi"
                  className="ps-icon-btn"
                  disabled={
                    !ttsUrl ||
                    recorderState === "recording" ||
                    recorderState === "uploading"
                  }
                  onClick={() => {
                    if (questionAudio.current) {
                      questionAudio.current.currentTime = 0;
                      void questionAudio.current.play().catch(() => undefined);
                    }
                  }}
                  title="Phát câu hỏi"
                  type="button"
                >
                  <Volume2 size={18} aria-hidden="true" />
                  <span>Nghe câu hỏi</span>
                </button>
                {playBlocked && (
                  <button
                    className="ps-play-blocked"
                    onClick={() => void questionAudio.current?.play()}
                    type="button"
                  >
                    ▶ Phát âm thanh câu hỏi
                  </button>
                )}
              </div>
            </div>

            {/* Mic / review section */}
            {recorderState === "idle" && (
              <div className="ps-mic-section">
                <p className="ps-mic-hint">Nhấn để bắt đầu ghi âm</p>
                <button
                  aria-label="Bắt đầu ghi âm"
                  className="ps-mic"
                  onClick={startRecording}
                  type="button"
                >
                  <Mic size={30} aria-hidden="true" />
                </button>
              </div>
            )}

            {recorderState === "recording" && (
              <div className="ps-mic-section">
                <p className="ps-record-blink">ĐANG GHI ÂM</p>
                <p aria-live="polite" className="ps-record-timer">
                  {formatTime(seconds)}
                </p>
                <button
                  aria-label="Dừng ghi âm"
                  className="ps-mic ps-mic--recording"
                  onClick={() => void stopRecording()}
                  type="button"
                >
                  <Square size={24} fill="currentColor" aria-hidden="true" />
                </button>
                <p className="ps-mic-hint">Nhấn để dừng và nghe lại</p>
              </div>
            )}

            {(recorderState === "review" || recorderState === "uploading") &&
              pendingRecording && (
                <div className="ps-review">
                  <p className="ps-review-label">Nghe lại câu trả lời</p>
                  <p className="ps-review-duration">
                    Thời lượng: {formatDuration(pendingRecording.durationMs)}
                  </p>
                  <audio
                    className="ps-review-audio"
                    controls
                    preload="metadata"
                    src={pendingRecording.url}
                  />
                  {isTopicMode && (
                    <div className="ps-transcript-card">
                      <p className="ps-transcript-card__label">Bạn vừa nói</p>
                      <p className="ps-transcript-card__text">
                        {browserTranscript ||
                          (browserSpeechAvailable
                            ? "(Chưa bắt được lời — thử nói rõ hơn hoặc kiểm tra quyền mic)"
                            : "(Trình duyệt không hỗ trợ nhận dạng giọng nói)")}
                      </p>
                    </div>
                  )}
                  <div className="ps-review-actions">
                    <button
                      className="ps-btn ps-btn--ghost"
                      disabled={recorderState === "uploading"}
                      onClick={startRecording}
                      type="button"
                    >
                      Ghi lại
                    </button>
                    <button
                      className="ps-btn ps-btn--primary"
                      disabled={recorderState === "uploading"}
                      aria-busy={recorderState === "uploading"}
                      onClick={() => void upload()}
                      type="button"
                    >
                      {recorderState === "uploading"
                        ? "Đang gửi…"
                        : error
                          ? "Gửi lại bản ghi"
                          : "Gửi câu trả lời"}
                    </button>
                  </div>
                </div>
              )}
            {isIelts && <IeltsFlow recorderState={recorderState} playing={ttsPlaying} />}
          </div>
        )}

        {/* PROCESSING */}
        {stage === "processing" && (
          <div className="ps-stage ps-processing">
            {isIelts && <IeltsExaminer state={processingFailed ? "idle" : "thinking"} />}
            {!processingFailed && (
              <div aria-hidden="true" className="ps-processing-spinner" />
            )}
            <span className="ps-tag ps-tag--processing">
              Đã hoàn thành {totalQuestions}/{totalQuestions}
            </span>
            <h2 className="ps-processing-title">
              {processingFailed
                ? "Có sự cố khi xử lý"
                : "Đang xử lý câu trả lời…"}
            </h2>
            <p className="ps-processing-sub">
              {/* Đã chuyển đổi {status?.completed ?? 0}/{totalQuestions} câu */}
            </p>
            {processingFailed && (
              <button
                className="ps-btn ps-btn--primary"
                onClick={retryProcessing}
                type="button"
              >
                Thử lại xử lý
              </button>
            )}
          </div>
        )}

        {/* RESULT */}
        {stage === "result" && result && (
          <div className="ps-stage ps-card--result">
            <ResultView
              answers={answers}
              experience={experience}
              guestToken={session?.sessionToken}
              onRestart={
                principalKind === "guest" ? resetGuestSession : undefined
              }
              principalKind={principalKind}
              result={result}
              onContinue={onQuickCheckComplete && session ? () => onQuickCheckComplete(session.sessionId) : undefined}
              isContinuing={completionPending}
            />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <p className="ps-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {stage !== "result" && isIelts && (
        <IeltsSessionInfo
          completed={stage === "processing" ? totalQuestions : currentIndex}
          current={stage === "setup" ? 0 : Math.min(currentIndex + 1, totalQuestions)}
          total={totalQuestions}
          part={question ? questionLabel(question, "IELTS") : undefined}
          status={stage === "setup" ? "Chưa bắt đầu" : stage === "processing" ? processingFailed ? "Cần thử lại" : "Đang xử lý" : recorderState === "recording" ? "Đang ghi âm" : recorderState === "review" ? "Sẵn sàng nghe lại" : recorderState === "uploading" ? "Đang gửi…" : ttsPlaying ? "Đang đọc câu hỏi" : "Sẵn sàng"}
        >
          {session && currentIndex > 0 && <details className="ielts-info-card ielts-history"><summary>Câu đã luyện ({Math.min(currentIndex, totalQuestions)})</summary>
            {session.questions.slice(0, currentIndex).map((previous, index) => <article className="ps-conversation-turn" key={previous.sessionQuestionId}><p className="ps-conversation-speaker">CÂU {index + 1} · ĐÃ GỬI</p><p lang="en">{previous.promptText}</p></article>)}
          </details>}
        </IeltsSessionInfo>
      )}
      {stage !== "result" && !isIelts && (
        <aside className="ps-companion" aria-label="Thông tin phiên luyện">
          <div className="ps-companion-heading">
            <div className="ps-bg-zone"><PracticeAvatar state={avatarState} /></div>
            <div><h2>Phiên luyện của bạn</h2><p>{topbarTitle}</p></div>
          </div>
          {stage === "practice" && session && currentIndex > 0 ? (
            <div className="ps-conversation">
              <p className="eyebrow">CÁC CÂU VỪA LUYỆN</p>
              {session.questions.slice(Math.max(0, currentIndex - 3), currentIndex).map((previous, index) => (
                <article className="ps-conversation-turn" key={previous.sessionQuestionId}>
                  <p className="ps-conversation-speaker">SPEAKORA · CÂU {Math.max(0, currentIndex - 3) + index + 1}</p>
                  <p className="ps-conversation-bubble" lang="en">{previous.promptText}</p>
                  <span className="ps-conversation-status"><Check size={13} aria-hidden="true" /> Đã gửi câu trả lời</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="ps-companion-guide">
              <p className="eyebrow">TỪNG BƯỚC MỘT</p>
              <ol><li>Nghe và đọc câu hỏi.</li><li>Ghi âm câu trả lời của bạn.</li><li>Nghe lại, ghi lại nếu cần rồi gửi.</li></ol>
            </div>
          )}
          <p className="ps-companion-note">{stage === "processing" ? "Bản ghi đã được gửi. Phản hồi sẽ xuất hiện khi xử lý hoàn tất." : "Bạn có thể nghe lại câu hỏi và ghi lại câu trả lời trước khi gửi."}</p>
        </aside>
      )}
      </div>

      <ReauthenticateDialog
        onAuthenticated={() => {
          setReauthenticate(false);
          void upload(pendingRef.current);
        }}
        onCancel={() => {
          if (
            window.confirm(
              "Bản ghi chưa gửi sẽ mất nếu bạn đóng hoặc tải lại trang. Tiếp tục ở lại trang này?",
            )
          ) {
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
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
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

function questionLabel(
  question: SessionQuestion,
  mode: ClientPracticeSession["mode"],
): string {
  if (mode === "GENERAL")
    return question.topic?.name.toLocaleUpperCase() ?? "GENERAL ENGLISH";
  if (question.questionType === "IELTS_PART_1") return "PART 1 — KHỞI ĐỘNG";
  if (question.questionType === "IELTS_PART_2_CUE_CARD")
    return "PART 2 — TRÌNH BÀY DÀI";
  return "PART 3 — THẢO LUẬN";
}
