"use client";

import { fetchTtsObjectUrl, TTS_RETRY_LABEL, ttsUrl as ttsAudioUrl } from "../audio/tts-client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Mic, RotateCcw, Send, Square, Volume2, X } from "lucide-react";
import type {
  AnswerReview,
  ClientPracticeSession,
  GeneralResultExperience,
  PracticeResult,
  SessionQuestion,
  SessionStatus,
} from "../../modules/practice/types";
import { IeltsExaminer, IeltsFlow, IeltsSessionInfo } from "./ielts-presentation";
import "./ielts-practice.css";
import "../session-frame/session-frame.css";
import { topicDisplayName } from "../../modules/topics/display-name";
import { getTopicPresentation } from "../../modules/topics/presentation";
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
  // Loading the prompt audio failed: offer a real reload, since there is no source to play.
  const [ttsFailed, setTtsFailed] = useState(false);
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
          const createdUrl = await fetchTtsObjectUrl(
            ttsAudioUrl("question", activeSession.sessionId, item.sessionQuestionId),
            { headers: authHeaders(activeSession), signal },
          );
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
          setTtsFailed(true);
          setError(message(reason, "Không thể phát câu hỏi."));
        }
        return "";
      }
    },
    [authHeaders],
  );

  function retryTts() {
    if (!session || !question) return;
    setTtsFailed(false);
    setError("");
    ttsAbort.current?.abort();
    const controller = new AbortController();
    ttsAbort.current = controller;
    void loadTts(question, session, true, ttsEpoch.current.begin(), controller.signal);
  }

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

  /* ── Labels ───────────────────────────────────────────────────────────── */

  const topicSource = question?.topic ?? session?.topic ?? null;
  const topicName = topicSource ? topicDisplayName(topicSource.slug, topicSource.name) : null;
  const presentation = isTopicMode && topicSource ? getTopicPresentation(topicSource.slug, topicName ?? topicSource.name) : null;
  const answered = session ? session.questions.slice(0, Math.min(currentIndex, totalQuestions)) : [];
  const sent = stage === "processing" || stage === "result" ? totalQuestions : stage === "practice" ? currentIndex : 0;
  const sentPct = Math.round((sent / totalQuestions) * 100);
  const sessionTitle = session?.sessionKind === "QUICK_CHECK" ? "Quick Speaking Check" : isTopicMode ? (topicName ?? "Luyện nói theo chủ đề") : "IELTS Speaking";
  const topLabel = stage === "practice" && question
    ? `Câu ${currentIndex + 1} / ${totalQuestions} · ${sessionTitle}`
    : stage === "processing" ? "Đang xử lý câu trả lời" : stage === "result" ? `Kết quả · ${sessionTitle}` : sessionTitle;
  const exit = onExit ?? (principalKind === "guest"
    ? resetGuestSession
    : () => window.location.assign(isTopicMode && topicSource ? `/topics/${encodeURIComponent(topicSource.slug)}` : "/ielts"));
  const statusLabel = stage === "setup" ? "Chưa bắt đầu" : stage === "processing" ? processingFailed ? "Cần thử lại" : "Đang xử lý" : recorderState === "recording" ? "Đang ghi âm" : recorderState === "review" ? "Sẵn sàng nghe lại" : recorderState === "uploading" ? "Đang gửi…" : ttsPlaying ? "Đang đọc câu hỏi" : "Sẵn sàng";

  function replayQuestion() {
    if (!questionAudio.current) return;
    questionAudio.current.currentTime = 0;
    void questionAudio.current.play().catch(() => undefined);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  // A5 session frame: status on top, a body that scrolls on its own, actions pinned at the bottom.

  return (
    <div className={`ps-shell a5-session ps-shell--${stage}${isIelts ? " ielts-shell" : ""}`}>
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

      <div className="a5-session-top">
        {principalKind === "guest" && <Brand compact />}
        <button aria-label="Thoát phiên luyện" className="a5-round" onClick={exit} type="button">
          <X size={20} aria-hidden="true" />
        </button>
        <p className="a5-session-count">{topLabel}</p>
        <div
          aria-label={`Đã gửi ${sent} trên ${totalQuestions} câu`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={sentPct}
          className="a5-dots"
          role="progressbar"
        >
          {Array.from({ length: totalQuestions }, (_, index) => (
            <span
              className={index < sent ? "is-done" : stage === "practice" && index === currentIndex ? "is-now" : undefined}
              key={index}
            />
          ))}
        </div>
      </div>

      <div className={`a5-session-body${stage === "result" ? " a5-session-body--single" : ""}`}>
        <div className="a5-session-main">
          {error && (
            <p className="ps-error" role="alert">
              {error}
            </p>
          )}

          {/* SETUP */}
          {stage === "setup" && (
            <section className="a5-session-card ps-setup">
              {isIelts && <IeltsExaminer state="idle" />}
              <h1 className="ps-setup-title">Luyện nói trọn phiên trong 5 câu</h1>
              <p className="ps-setup-lead">Nghe câu hỏi, thu âm, nghe lại và chỉ gửi khi bạn hài lòng.</p>
            </section>
          )}

          {/* PRACTICE */}
          {stage === "practice" && session && question && (
            <>
              <section aria-labelledby="ps-question" className="a5-bubble">
                {/* The fixed top bar already says "Câu x / n · topic"; the bubble only adds the IELTS part. */}
                {isIelts && <p className="a5-bubble-meta">{questionLabel(question, session.mode, topicName)}</p>}
                <h1 id="ps-question" lang="en">{question.promptText}</h1>
                {question.instructionText && <p lang="en">{question.instructionText}</p>}
                {question.promptItems.length > 0 && (
                  <ul lang="en">
                    {question.promptItems.map((item) => <li key={item.sequenceNo}>{item.content}</li>)}
                  </ul>
                )}
                <div className="a5-bubble-actions">
                  <button
                    aria-label="Phát câu hỏi"
                    className="a5-pill-light"
                    disabled={!ttsUrl || recorderState === "recording" || recorderState === "uploading"}
                    onClick={replayQuestion}
                    type="button"
                  >
                    <Volume2 size={18} aria-hidden="true" />
                    {ttsPlaying ? "Đang đọc câu hỏi…" : "Nghe câu hỏi"}
                  </button>
                  {ttsFailed && (
                    <button className="a5-pill-light" onClick={retryTts} type="button">▶ {TTS_RETRY_LABEL}</button>
                  )}
                  {playBlocked && !ttsFailed && (
                    <button className="a5-pill-light" onClick={replayQuestion} type="button">▶ Phát âm thanh câu hỏi</button>
                  )}
                </div>
              </section>
              {isIelts && <IeltsFlow recorderState={recorderState} playing={ttsPlaying} />}
              {(recorderState === "review" || recorderState === "uploading") && pendingRecording && (
                <>
                  <div className="a5-box">
                    <h3>Nghe lại câu trả lời</h3>
                    <p>Thời lượng: {formatDuration(pendingRecording.durationMs)}</p>
                    <audio className="a5-review-audio" controls preload="metadata" src={pendingRecording.url} />
                  </div>
                  {isTopicMode && (
                    <div className="a5-lined">
                      <h3>Bạn vừa nói</h3>
                      <p lang="en">
                        {browserTranscript ||
                          (browserSpeechAvailable
                            ? "(Chưa bắt được lời — thử nói rõ hơn hoặc kiểm tra quyền mic)"
                            : "(Trình duyệt không hỗ trợ nhận dạng giọng nói)")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* PROCESSING */}
          {stage === "processing" && (
            <section className="a5-session-card ps-processing">
              {isIelts && <IeltsExaminer state={processingFailed ? "idle" : "thinking"} />}
              {!processingFailed && <div aria-hidden="true" className="ps-processing-spinner" />}
              <p className="a5-session-count">Đã gửi {totalQuestions}/{totalQuestions} câu</p>
              <h1 className="ps-processing-title">{processingFailed ? "Có sự cố khi xử lý" : "Đang xử lý câu trả lời…"}</h1>
              <p className="ps-processing-sub">Phản hồi sẽ xuất hiện khi xử lý hoàn tất. Bạn có thể giữ trang này mở.</p>
            </section>
          )}

          {/* RESULT */}
          {stage === "result" && result && (
            <div className="ps-card--result">
              <ResultView
                answers={answers}
                experience={experience}
                guestToken={session?.sessionToken}
                onRestart={principalKind === "guest" ? resetGuestSession : undefined}
                principalKind={principalKind}
                result={result}
                onContinue={onQuickCheckComplete && session ? () => onQuickCheckComplete(session.sessionId) : undefined}
                isContinuing={completionPending}
              />
            </div>
          )}
        </div>

        {stage !== "result" && isIelts && (
          <div className="a5-session-side">
            {stage === "practice" && <IeltsExaminer state={recorderState === "uploading" ? "thinking" : avatarState} />}
            <IeltsSessionInfo
              completed={sent}
              current={stage === "setup" ? 0 : Math.min(currentIndex + 1, totalQuestions)}
              total={totalQuestions}
              part={question ? questionLabel(question, "IELTS", null) : undefined}
              status={statusLabel}
            >
              {session && currentIndex > 0 && <details className="ielts-info-card ielts-history"><summary>Câu đã luyện ({Math.min(currentIndex, totalQuestions)})</summary>
                {answered.map((previous, index) => <article className="ps-conversation-turn" key={previous.sessionQuestionId}><p className="ps-conversation-speaker">Câu {index + 1} · đã gửi</p><p lang="en">{previous.promptText}</p></article>)}
              </details>}
            </IeltsSessionInfo>
          </div>
        )}
        {stage !== "result" && !isIelts && (
          <aside aria-label="Thông tin phiên luyện" className="a5-session-side">
            {presentation && presentation.vocabulary.length > 0 && (
              <div className="a5-box">
                <h3>Từ nên dùng</h3>
                <div className="a5-box-words" lang="en">{presentation.vocabulary.map((word) => <span key={word}>{word}</span>)}</div>
              </div>
            )}
            {presentation && (
              <div className="a5-box">
                <h3>Bối cảnh</h3>
                <p>{presentation.context}</p>
              </div>
            )}
            {answered.length > 0 ? (
              <div className="a5-box">
                <h3>Đã trả lời</h3>
                <ol className="a5-done-list" lang="en">
                  {answered.map((previous) => <li key={previous.sessionQuestionId}><Check size={18} aria-hidden="true" />{previous.promptText}</li>)}
                </ol>
              </div>
            ) : (
              <div className="a5-box">
                <h3>Từng bước</h3>
                <ol className="a5-done-list">
                  <li>1. Nghe và đọc câu hỏi.</li>
                  <li>2. Ghi âm câu trả lời của bạn.</li>
                  <li>3. Nghe lại, ghi lại nếu cần rồi gửi.</li>
                </ol>
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="a5-session-actions">
        {stage === "setup" && (
          <button aria-busy={startingSession} className="a5-btn" disabled={startingSession} onClick={startGuestSession} type="button">
            {startingSession ? "Đang chuẩn bị…" : "Bắt đầu phiên luyện"}<ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        {stage === "practice" && session && question && recorderState === "idle" && (
          <div className="a5-deck">
            <button aria-label="Bắt đầu ghi âm" className="a5-knob" onClick={startRecording} type="button">
              <span><Mic size={26} aria-hidden="true" /></span>
            </button>
            <div className="a5-deck-info">
              <strong>Nhấn để bắt đầu ghi âm</strong>
              <span>Tối đa {formatLimit(question.answerSeconds)}</span>
            </div>
          </div>
        )}
        {stage === "practice" && recorderState === "recording" && (
          <div className="a5-deck">
            <button aria-label="Dừng ghi âm" className="a5-knob is-on" onClick={() => void stopRecording()} type="button">
              <span><Square size={22} fill="currentColor" aria-hidden="true" /></span>
            </button>
            <div className="a5-deck-info">
              <strong>Đang ghi âm · nhấn để dừng</strong>
              <span aria-live="polite">{formatTime(seconds)}</span>
            </div>
          </div>
        )}
        {stage === "practice" && (recorderState === "review" || recorderState === "uploading") && pendingRecording && (
          <div className="a5-deck">
            <div className="a5-deck-info">
              <strong>{recorderState === "uploading" ? "Đang gửi câu trả lời…" : "Nghe lại rồi gửi khi bạn hài lòng"}</strong>
              <span>{formatDuration(pendingRecording.durationMs)}</span>
            </div>
            <div className="a5-deck-buttons">
              <button className="a5-btn a5-btn-ghost" disabled={recorderState === "uploading"} onClick={startRecording} type="button">
                <RotateCcw size={18} aria-hidden="true" />Ghi lại
              </button>
              <button aria-busy={recorderState === "uploading"} className="a5-btn a5-btn-teal" disabled={recorderState === "uploading"} onClick={() => void upload()} type="button">
                <Send size={18} aria-hidden="true" />
                {recorderState === "uploading" ? "Đang gửi…" : error ? "Gửi lại bản ghi" : "Gửi câu trả lời"}
              </button>
            </div>
          </div>
        )}
        {stage === "processing" && processingFailed && (
          <button className="a5-btn" onClick={retryProcessing} type="button">Thử lại xử lý</button>
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
  topicName: string | null,
): string {
  if (mode === "GENERAL") return topicName ?? "Luyện nói theo chủ đề";
  if (question.questionType === "IELTS_PART_1") return "Part 1 · Khởi động";
  if (question.questionType === "IELTS_PART_2_CUE_CARD") return "Part 2 · Trình bày dài";
  return "Part 3 · Thảo luận";
}

/** "1 phút", "2 phút" or "45 giây" for the answer time limit. */
function formatLimit(totalSeconds: number): string {
  return totalSeconds >= 60 && totalSeconds % 60 === 0 ? `${totalSeconds / 60} phút` : `${totalSeconds} giây`;
}
