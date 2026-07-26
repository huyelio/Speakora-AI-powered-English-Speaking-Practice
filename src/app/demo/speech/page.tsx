"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SPEECH_API = "/api/demo/speech";
const QUESTION_API = "/api/questions/random";

type PracticeMode = "IELTS" | "TOEIC" | "GENERAL";
type Stage = "setup" | "ready" | "listen" | "record" | "review" | "processing" | "result";

type Question = {
  id: string;
  code: string;
  mode: PracticeMode;
  question_type: string;
  topic: { slug: string; name: string } | null;
  group: { title: string; shared_context: string | null } | null;
  prompt_text: string;
  instruction_text: string | null;
  prompt_items: Array<{ content: string; sequence_no: number }>;
  prep_seconds: number;
  answer_seconds: number;
};

const steps = [
  { id: "setup", label: "Chọn bài" },
  { id: "ready", label: "Chuẩn bị" },
  { id: "listen", label: "Nghe câu hỏi" },
  { id: "record", label: "Ghi âm" },
  { id: "review", label: "Xem lại" },
  { id: "result", label: "Feedback" },
] as const;

const stageOrder: Record<Stage, number> = {
  setup: 0,
  ready: 1,
  listen: 2,
  record: 3,
  review: 4,
  processing: 5,
  result: 5,
};

export default function SpeechDemoPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [mode, setMode] = useState<PracticeMode>("GENERAL");
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [questionAudioUrl, setQuestionAudioUrl] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState("");
  const [answerBlob, setAnswerBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentStep = stageOrder[stage];
  const answerLimit = question?.answer_seconds || 60;
  const progress = stage === "record" ? Math.min(100, (recordedSeconds / answerLimit) * 100) : 0;

  const wordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );
  const wordsPerMinute = recordedSeconds > 0 ? Math.round((wordCount / recordedSeconds) * 60) : 0;

  const revokeUrl = useCallback((url: string) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (stage !== "ready" || timeLeft <= 0) return;
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, timeLeft]);

  useEffect(() => {
    if (stage === "ready" && timeLeft === 0) setStage("listen");
  }, [stage, timeLeft]);

  useEffect(() => {
    if (stage !== "record") return;
    if (recordedSeconds >= answerLimit) {
      stopRecording();
      return;
    }
    const timer = window.setTimeout(() => setRecordedSeconds((value) => value + 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, recordedSeconds, answerLimit]);

  async function readError(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || `Yêu cầu thất bại (${response.status}).`;
  }

  async function beginSession() {
    setLoading(true);
    setError("");
    setTranscript("");
    try {
      const response = await fetch(`${QUESTION_API}?mode=${mode}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { data: Question };
      setQuestion(result.data);
      setTimeLeft(Math.max(3, result.data.prep_seconds));
      setStage("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo phiên luyện.");
    } finally {
      setLoading(false);
    }
  }

  async function createQuestionAudio() {
    if (!question) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(SPEECH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question.prompt_text }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const url = URL.createObjectURL(await response.blob());
      revokeUrl(questionAudioUrl);
      setQuestionAudioUrl(url);
      requestAnimationFrame(() => void questionAudioRef.current?.play());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo giọng đọc.");
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Trình duyệt này không hỗ trợ ghi âm.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordedSeconds(0);
      setAnswerBlob(null);
      revokeUrl(answerAudioUrl);
      setAnswerAudioUrl("");
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAnswerBlob(blob);
        setAnswerAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setStage("review");
      };
      recorder.start();
      setStage("record");
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Bạn cần cho phép truy cập microphone để tiếp tục."
          : "Không thể bắt đầu ghi âm.",
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function submitAnswer() {
    if (!answerBlob) return;
    setStage("processing");
    setError("");
    try {
      const extension = answerBlob.type.includes("mp4")
        ? "mp4"
        : answerBlob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const formData = new FormData();
      formData.append("audio", answerBlob, `answer.${extension}`);
      const response = await fetch(SPEECH_API, { method: "POST", body: formData });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { text: string };
      setTranscript(result.text || "");
      setStage("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý câu trả lời.");
      setStage("review");
    }
  }

  function retryQuestion() {
    setTranscript("");
    setRecordedSeconds(0);
    setAnswerBlob(null);
    revokeUrl(answerAudioUrl);
    setAnswerAudioUrl("");
    setTimeLeft(Math.max(3, question?.prep_seconds || 15));
    setStage("ready");
  }

  function newSession() {
    revokeUrl(questionAudioUrl);
    revokeUrl(answerAudioUrl);
    setQuestionAudioUrl("");
    setAnswerAudioUrl("");
    setQuestion(null);
    setAnswerBlob(null);
    setTranscript("");
    setError("");
    setStage("setup");
  }

  return (
    <main className="practice-shell">
      <header className="topbar">
        <button className="brand" onClick={newSession} aria-label="Về đầu">
          <span className="brand-mark">S</span>
          <span>Speakora</span>
        </button>
        <span className="session-pill">Phiên luyện nhanh · 1 câu</span>
      </header>

      <nav className="stepper" aria-label="Tiến trình phiên luyện">
        {steps.map((step, index) => (
          <div className={`step-item ${index <= currentStep ? "active" : ""}`} key={step.id}>
            <span>{index < currentStep ? "✓" : index + 1}</span>
            <small>{step.label}</small>
          </div>
        ))}
      </nav>

      <section className="practice-card">
        {stage === "setup" && (
          <div className="stage stage-setup">
            <p className="eyebrow">LUYỆN NÓI CÓ HƯỚNG DẪN</p>
            <h1>Bắt đầu với một câu hỏi phù hợp</h1>
            <p className="lead">Chọn mục tiêu. Speakora sẽ điều phối thời gian, ghi âm và phản hồi nhanh sau khi bạn trả lời.</p>
            <div className="mode-grid">
              {([
                ["GENERAL", "General English", "Giao tiếp tự nhiên theo chủ đề", "💬"],
                ["IELTS", "IELTS Speaking", "Luyện phản xạ theo dạng bài", "🎓"],
                ["TOEIC", "TOEIC Speaking", "Trả lời rõ ràng trong công việc", "💼"],
              ] as const).map(([value, title, description, icon]) => (
                <button
                  key={value}
                  className={`mode-card ${mode === value ? "selected" : ""}`}
                  onClick={() => setMode(value)}
                >
                  <span className="mode-icon">{icon}</span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                  <span className="radio">{mode === value ? "●" : "○"}</span>
                </button>
              ))}
            </div>
            <div className="session-summary">
              <span>⏱ Khoảng 3 phút</span><span>🎙 1 câu trả lời</span><span>✨ Feedback tức thì</span>
            </div>
            <button className="primary large" onClick={beginSession} disabled={loading}>
              {loading ? "Đang chuẩn bị…" : "Bắt đầu phiên luyện →"}
            </button>
          </div>
        )}

        {stage === "ready" && question && (
          <div className="stage centered">
            <p className="eyebrow">{question.mode} · {question.topic?.name || "SPEAKING PRACTICE"}</p>
            <div className="timer-ring" style={{ "--progress": `${(timeLeft / Math.max(question.prep_seconds, 3)) * 360}deg` } as React.CSSProperties}>
              <div><strong>{timeLeft}</strong><span>giây</span></div>
            </div>
            <h1>Chuẩn bị tinh thần</h1>
            <p className="lead narrow">Hít thở, kiểm tra microphone và sẵn sàng nghe câu hỏi. Câu hỏi sẽ xuất hiện ở bước tiếp theo.</p>
            <button className="secondary" onClick={() => setStage("listen")}>Bỏ qua thời gian chuẩn bị</button>
          </div>
        )}

        {stage === "listen" && question && (
          <div className="stage">
            <p className="eyebrow">{question.mode} · {question.topic?.name || question.question_type}</p>
            <div className="question-panel">
              <span className="quote-mark">“</span>
              <h1>{question.prompt_text}</h1>
              {question.instruction_text && <p>{question.instruction_text}</p>}
              {question.prompt_items.length > 0 && (
                <ul>{question.prompt_items.map((item) => <li key={item.sequence_no}>{item.content}</li>)}</ul>
              )}
            </div>
            <button className="audio-button" onClick={createQuestionAudio} disabled={loading}>
              <span>▶</span>{loading ? "Đang tạo giọng đọc…" : "Nghe câu hỏi"}
            </button>
            {questionAudioUrl && <audio ref={questionAudioRef} src={questionAudioUrl} controls className="audio-player" />}
            <p className="hint">Bạn có tối đa {question.answer_seconds} giây để trả lời.</p>
            <button className="primary large" onClick={startRecording}>Tôi đã sẵn sàng · Bắt đầu ghi âm</button>
          </div>
        )}

        {stage === "record" && question && (
          <div className="stage centered">
            <p className="eyebrow recording-label"><span /> ĐANG GHI ÂM</p>
            <div className="record-time">{formatTime(recordedSeconds)}</div>
            <div className="record-progress"><i style={{ width: `${progress}%` }} /></div>
            <p className="remaining">Còn {Math.max(0, answerLimit - recordedSeconds)} giây</p>
            <div className="compact-question">{question.prompt_text}</div>
            <div className="mic-pulse">🎙</div>
            <button className="danger" onClick={stopRecording}>■ Dừng và xem lại</button>
          </div>
        )}

        {stage === "review" && question && (
          <div className="stage">
            <p className="eyebrow">CÂU TRẢ LỜI CỦA BẠN</p>
            <h1>Nghe lại trước khi nộp</h1>
            <div className="review-card">
              <div><strong>{formatTime(recordedSeconds)}</strong><span>Thời lượng ghi âm</span></div>
              {answerAudioUrl && <audio controls src={answerAudioUrl} className="audio-player" />}
            </div>
            <div className="button-row">
              <button className="secondary" onClick={() => void startRecording()}>↻ Ghi lại</button>
              <button className="primary" onClick={submitAnswer}>Nộp và nhận feedback →</button>
            </div>
            <p className="hint">Bản ghi hiện chỉ được giữ trong phiên trình duyệt này.</p>
          </div>
        )}

        {stage === "processing" && (
          <div className="stage centered processing">
            <div className="spinner" />
            <h1>Đang lắng nghe câu trả lời…</h1>
            <p className="lead">Speakora đang chuyển giọng nói thành văn bản và tổng hợp các chỉ số nhanh.</p>
          </div>
        )}

        {stage === "result" && question && (
          <div className="stage result-stage">
            <p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN</p>
            <h1>Khởi đầu tốt — hãy thử nói trọn ý hơn</h1>
            <div className="metric-grid">
              <div><strong>{recordedSeconds}s</strong><span>Thời lượng</span></div>
              <div><strong>{wordCount}</strong><span>Số từ</span></div>
              <div><strong>{wordsPerMinute || "—"}</strong><span>Từ / phút</span></div>
            </div>
            <div className="feedback-grid">
              <article>
                <h2>Transcript</h2>
                <p className="transcript">{transcript || "Không nhận diện được lời nói trong bản ghi."}</p>
              </article>
              <article>
                <h2>Gợi ý cho lần tiếp theo</h2>
                <ul className="tips">
                  <li><span>✓</span><p><strong>Bạn đã hoàn thành câu trả lời</strong><small>Hãy nghe lại audio để tự kiểm tra độ rõ ràng.</small></p></li>
                  <li><span>→</span><p><strong>{wordCount < 25 ? "Mở rộng câu trả lời" : "Giữ nhịp nói ổn định"}</strong><small>{wordCount < 25 ? "Thêm một lý do và một ví dụ cụ thể." : "Dùng từ nối để các ý liền mạch hơn."}</small></p></li>
                </ul>
                <p className="disclosure">Đây là phản hồi nhanh dựa trên transcript và thời lượng, chưa phải điểm chấm phát âm.</p>
              </article>
            </div>
            <div className="button-row">
              <button className="secondary" onClick={newSession}>Câu hỏi mới</button>
              <button className="primary" onClick={retryQuestion}>↻ Thử lại câu này</button>
            </div>
          </div>
        )}

        {error && <p role="alert" className="error">{error}</p>}
      </section>
    </main>
  );
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
