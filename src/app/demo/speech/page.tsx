"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerReview,
  Assessment,
  CriterionFeedback,
  SessionQuestion,
  SessionStatus,
} from "../../../modules/practice/types";

type Stage =
  | "setup"
  | "question"
  | "recording"
  | "uploading"
  | "processing"
  | "result"
  | "error";
type Saved = {
  sessionId: string;
  token: string;
  questions: SessionQuestion[];
  index: number;
};
const STORAGE_KEY = "speakora-ielts-session-v1";

export default function SpeechDemoPage() {
  const [stage, setStage] = useState<Stage>("setup"),
    [session, setSession] = useState<Saved | null>(null),
    [result, setResult] = useState<Assessment | null>(null),
    [answers, setAnswers] = useState<AnswerReview[]>([]),
    [status, setStatus] = useState<SessionStatus | null>(null),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0),
    [ttsUrl, setTtsUrl] = useState(""),
    [playBlocked, setPlayBlocked] = useState(false),
    [pending, setPending] = useState<{
      blob: Blob;
      durationMs: number;
      key: string;
    } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    startedAt = useRef(0),
    audio = useRef<HTMLAudioElement | null>(null),
    timer = useRef<number | null>(null),
    ttsCache = useRef(new Map<string, string>());
  const question = session?.questions[session.index];

  const save = useCallback((value: Saved | null) => {
    setSession(value);
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const value = JSON.parse(raw) as Saved;
      setSession(value);
      setStage(
        value.index >= value.questions.length ? "processing" : "question",
      );
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      ttsCache.current.forEach(URL.revokeObjectURL);
    },
    [],
  );

  const auth = (token = session?.token) => ({
    Authorization: `Bearer ${token}`,
  });
  async function apiError(r: Response) {
    const body = await r.json().catch(() => null);
    return body?.error || `Yêu cầu thất bại (${r.status}).`;
  }
  async function start() {
    setError("");
    setStage("uploading");
    try {
      const r = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "IELTS", questionCount: 5 }),
      });
      if (!r.ok) throw new Error(await apiError(r));
      const body = await r.json();
      const value: Saved = {
        sessionId: body.sessionId,
        token: body.sessionToken,
        questions: body.questions,
        index: 0,
      };
      save(value);
      setStage("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo phiên luyện.");
      setStage("setup");
    }
  }

  const loadTts = useCallback(
    async (q: SessionQuestion, s: Saved, autoPlay: boolean) => {
      try {
        let url = ttsCache.current.get(q.sessionQuestionId);
        if (!url) {
          const r = await fetch("/api/speech/tts", {
            method: "POST",
            headers: { ...auth(s.token), "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: s.sessionId,
              sessionQuestionId: q.sessionQuestionId,
            }),
          });
          if (!r.ok) throw new Error(await apiError(r));
          url = URL.createObjectURL(await r.blob());
          ttsCache.current.set(q.sessionQuestionId, url);
        }
        if (autoPlay) {
          setTtsUrl(url);
          setPlayBlocked(false);
          requestAnimationFrame(() =>
            audio.current?.play().catch(() => setPlayBlocked(true)),
          );
        }
        return url;
      } catch (e) {
        if (autoPlay) {
          setPlayBlocked(true);
          setError(e instanceof Error ? e.message : "Không thể phát câu hỏi.");
        }
        return "";
      }
    },
    [],
  );
  useEffect(() => {
    if (stage !== "question" || !question || !session) return;
    void loadTts(question, session, true).then(() => {
      const next = session.questions[session.index + 1];
      if (next) void loadTts(next, session, false);
    });
  }, [stage, question?.sessionQuestionId, session?.index]);

  async function toggleRecording() {
    if (stage === "recording") {
      recorder.current?.stop();
      return;
    }
    if (
      !question ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find(MediaRecorder.isTypeSupported);
      const next = type
        ? new MediaRecorder(media, { mimeType: type })
        : new MediaRecorder(media);
      stream.current = media;
      recorder.current = next;
      chunks.current = [];
      startedAt.current = Date.now();
      setSeconds(0);
      next.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      next.onstop = () => {
        const durationMs = Date.now() - startedAt.current;
        const blob = new Blob(chunks.current, {
          type: next.mimeType || "audio/webm",
        });
        media.getTracks().forEach((t) => t.stop());
        stream.current = null;
        recorder.current = null;
        if (timer.current) window.clearInterval(timer.current);
        const value = { blob, durationMs, key: crypto.randomUUID() };
        setPending(value);
        void upload(value);
      };
      next.start();
      timer.current = window.setInterval(
        () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
        1000,
      );
      setStage("recording");
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Bạn cần cho phép truy cập microphone."
          : "Không thể bắt đầu ghi âm.",
      );
    }
  }

  async function upload(value = pending) {
    if (!value || !session || !question) return;
    setStage("uploading");
    setError("");
    try {
      const ext = value.blob.type.includes("mp4")
        ? "mp4"
        : value.blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const form = new FormData();
      form.append("sessionQuestionId", question.sessionQuestionId);
      form.append("audio", value.blob, `answer.${ext}`);
      form.append("durationMs", String(value.durationMs));
      form.append("idempotencyKey", value.key);
      const r = await fetch(
        `/api/practice/sessions/${session.sessionId}/answers`,
        { method: "POST", headers: auth(), body: form },
      );
      if (!r.ok) throw new Error(await apiError(r));
      setPending(null);
      const next = { ...session, index: session.index + 1 };
      save(next);
      setStage(next.index >= next.questions.length ? "processing" : "question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải bản ghi.");
      setStage("error");
    }
  }

  const poll = useCallback(async () => {
    if (!session) return;
    try {
      const r = await fetch(
        `/api/practice/sessions/${session.sessionId}/status`,
        { headers: auth(), cache: "no-store" },
      );
      if (!r.ok) throw new Error(await apiError(r));
      const value = (await r.json()) as SessionStatus;
      setStatus(value);
      if (value.assessmentStatus === "COMPLETED") {
        const rr = await fetch(
          `/api/practice/sessions/${session.sessionId}/result`,
          { headers: auth(), cache: "no-store" },
        );
        if (!rr.ok) throw new Error(await apiError(rr));
        const body = await rr.json();
        setResult(body.result);
        setAnswers(body.answers || []);
        setStage("result");
      } else if (value.failed > 0 || value.assessmentStatus === "FAILED") {
        setError(
          "Một tác vụ xử lý đã thất bại. Bạn có thể thử lại mà không cần ghi âm lại.",
        );
        setStage("error");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể kiểm tra tiến trình.",
      );
    }
  }, [session]);
  useEffect(() => {
    if (stage !== "processing") return;
    void poll();
    const id = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(id);
  }, [stage, poll]);
  async function retryJobs() {
    if (!session) return;
    setError("");
    const r = await fetch(`/api/practice/sessions/${session.sessionId}/retry`, {
      method: "POST",
      headers: auth(),
    });
    if (!r.ok) {
      setError(await apiError(r));
      return;
    }
    setStage("processing");
  }
  function reset() {
    if (ttsUrl) URL.revokeObjectURL(ttsUrl);
    ttsCache.current.clear();
    save(null);
    setResult(null);
    setAnswers([]);
    setStatus(null);
    setPending(null);
    setError("");
    setStage("setup");
  }

  return (
    <main className="practice-shell">
      <header className="topbar">
        <button className="brand" onClick={reset}>
          <span className="brand-mark">S</span>
          <span>Speakora</span>
        </button>
        <span className="session-pill">IELTS Speaking · 5 câu</span>
      </header>
      <section className="practice-card">
        {stage === "setup" && (
          <div className="stage stage-setup">
            <p className="eyebrow">IELTS SPEAKING MVP</p>
            <h1>Luyện nói trọn phiên trong 5 câu</h1>
            <p className="lead">
              Nghe câu hỏi, ghi âm câu trả lời và nhận đánh giá tổng quan sau
              khi hoàn thành.
            </p>
            <div className="session-summary">
              <span>🎙 5 câu trả lời</span>
              <span>🔊 Tự động đọc câu hỏi</span>
              <span>✨ Đánh giá cuối phiên</span>
            </div>
            <button className="primary large" onClick={start}>
              Bắt đầu phiên luyện →
            </button>
          </div>
        )}
        {(stage === "question" ||
          stage === "recording" ||
          stage === "uploading") &&
          question &&
          session && (
            <div className="stage centered">
              <p className="eyebrow">{partLabel(question.questionType)}</p>
              <p>
                Câu {session.index + 1}/{session.questions.length}
              </p>
              <div className="question-progress">
                <i
                  style={{
                    width: `${((session.index + 1) / session.questions.length) * 100}%`,
                  }}
                />
              </div>
              <div className="question-panel">
                <h1>{question.promptText}</h1>
                {question.instructionText && <p>{question.instructionText}</p>}
                {question.promptItems.length > 0 && (
                  <ul>
                    {question.promptItems.map((x) => (
                      <li key={x.sequenceNo}>{x.content}</li>
                    ))}
                  </ul>
                )}
              </div>
              <audio ref={audio} src={ttsUrl} />
              {playBlocked && (
                <button
                  className="secondary"
                  onClick={() => audio.current?.play()}
                >
                  ▶ Phát câu hỏi
                </button>
              )}
              {stage === "recording" ? (
                <>
                  <p className="eyebrow recording-label">
                    <span /> ĐANG GHI ÂM
                  </p>
                  <div className="record-time">{formatTime(seconds)}</div>
                  <button
                    className="mic-toggle recording"
                    onClick={toggleRecording}
                  >
                    ■
                  </button>
                  <p className="hint">Nhấn để dừng và gửi câu trả lời</p>
                </>
              ) : stage === "uploading" ? (
                <>
                  <div className="spinner" />
                  <p>Đang lưu bản ghi…</p>
                </>
              ) : (
                <>
                  <button className="mic-toggle" onClick={toggleRecording}>
                    🎙
                  </button>
                  <p className="hint">
                    Nhấn microphone để bắt đầu, nhấn lại để kết thúc
                  </p>
                </>
              )}
            </div>
          )}
        {stage === "processing" && (
          <div className="stage centered processing">
            <div className="spinner" />
            <p className="eyebrow">ĐÃ HOÀN THÀNH 5/5</p>
            <h1>Đang xử lý câu trả lời…</h1>
            <p className="lead">Kết quả sẽ tự động xuất hiện khi hoàn tất.</p>
            <p className="hint">Đã chuyển đổi {status?.completed || 0}/5 câu</p>
          </div>
        )}
        {stage === "error" && (
          <div className="stage centered">
            <h1>Có sự cố cần xử lý</h1>
            <p className="error">{error}</p>
            {pending ? (
              <button className="primary" onClick={() => upload()}>
                Gửi lại bản ghi
              </button>
            ) : (
              <button className="primary" onClick={retryJobs}>
                Thử lại xử lý
              </button>
            )}
          </div>
        )}
        {stage === "result" && result && session && (
          <div className="stage result-stage">
            <p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN</p>
            <div className="band-card">
              <span>Band ước tính bởi AI</span>
              <strong>{result.estimatedBand.toFixed(1)}</strong>
            </div>
            <article className="feedback-card">
              <h2>Nhận xét tổng quan</h2>
              <p>{result.overallFeedback}</p>
            </article>
            <section>
              <h2>Đánh giá theo tiêu chí</h2>
              <div className="feedback-grid">
                {result.criteria && (
                  <>
                    <Criterion
                      title="Độ trôi chảy & mạch lạc"
                      text={result.criteria.fluencyCoherence}
                    />
                    <Criterion
                      title="Từ vựng"
                      text={result.criteria.lexicalResource}
                    />
                    <Criterion
                      title="Ngữ pháp"
                      text={result.criteria.grammaticalRangeAccuracy}
                    />
                  </>
                )}
                <Criterion
                  title="Phát âm — Chưa đánh giá trong phiên bản hiện tại"
                  text="Tiêu chí này cần phân tích trực tiếp tín hiệu âm thanh, không thể suy ra đáng tin cậy từ transcript."
                />
              </div>
            </section>
            <div className="feedback-grid">
              <Feedback title="Điểm mạnh" items={result.strengths} />
              <Feedback title="Cần cải thiện" items={result.improvements} />
              <Feedback
                title="Gợi ý luyện tập tiếp theo"
                items={result.nextSteps}
              />
            </div>
            <p className="disclosure">
              Band trên là ước tính của AI dựa trên transcript, không phải điểm
              IELTS chính thức.
            </p>
            <section className="answer-review">
              <h2>XEM LẠI CÂU TRẢ LỜI</h2>
              {answers.map((answer) => (
                <article className="feedback-card" key={answer.answerId}>
                  <p className="eyebrow">
                    CÂU {answer.sequenceNo} · {partName(answer.questionType)}
                  </p>
                  <h3>{answer.promptText}</h3>
                  <AuthorizedAudio
                    endpoint={answer.audioUrl}
                    token={session.token}
                  />
                  <h4>Transcript gốc</h4>
                  <p>{answer.transcript}</p>
                </article>
              ))}
            </section>
            <button className="primary" onClick={reset}>
              Luyện phiên mới
            </button>
          </div>
        )}
        {error && stage !== "error" && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
function Feedback({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="feedback-card">
      <h2>{title}</h2>
      <ul>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </article>
  );
}
function Criterion({ title, text }: { title: string; text: string | CriterionFeedback }) {
  const feedback=typeof text==="string"?{summary:text,example:null}:text;
  return (
    <article className="feedback-card">
      <h3>{title}</h3>
      <p>{feedback.summary}</p>
      {feedback.example&&<p className="criterion-example"><strong>Ví dụ:</strong> “{feedback.example.original}”{feedback.example.corrected&&<> → “{feedback.example.corrected}”</>}</p>}
    </article>
  );
}
function partName(type: string) {
  return type === "IELTS_PART_1"
    ? "IELTS Part 1"
    : type === "IELTS_PART_2_CUE_CARD"
      ? "IELTS Part 2"
      : "IELTS Part 3";
}
function partLabel(type: string) {
  return type === "IELTS_PART_1"
    ? "PART 1 — KHỞI ĐỘNG"
    : type === "IELTS_PART_2_CUE_CARD"
      ? "PART 2 — LONG TURN"
      : "PART 3 — THẢO LUẬN";
}
function AuthorizedAudio({
  endpoint,
  token,
}: {
  endpoint: string;
  token: string;
}) {
  const [url, setUrl] = useState(""),
    [loading, setLoading] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setUrl(URL.createObjectURL(await response.blob()));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  if (failed)
    return (
      <>
        <p className="error">Không thể tải bản ghi âm.</p>
        <button className="secondary" onClick={load}>
          Thử tải lại
        </button>
      </>
    );
  return url ? (
    <audio controls preload="metadata" src={url} />
  ) : (
    <button className="secondary" disabled={loading} onClick={load}>
      {loading ? "Đang tải bản ghi âm…" : "▶ Nghe bản ghi âm"}
    </button>
  );
}
function formatTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
