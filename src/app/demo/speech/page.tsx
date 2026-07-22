"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_PATH = "/api/demo/speech";
const QUESTION_API_PATH = "/api/questions/random";

type PracticeMode = "IELTS" | "TOEIC" | "GENERAL";
type BusyState = "question" | "tts" | "transcribing" | null;

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

export default function SpeechDemoPage() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<PracticeMode>("GENERAL");
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [questionAudioUrl, setQuestionAudioUrl] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState("");
  const [answerBlob, setAnswerBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (questionAudioUrl) URL.revokeObjectURL(questionAudioUrl);
    };
  }, [questionAudioUrl]);

  useEffect(() => {
    return () => {
      if (answerAudioUrl) URL.revokeObjectURL(answerAudioUrl);
    };
  }, [answerAudioUrl]);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const loadRandomQuestion = useCallback(async (selectedMode: PracticeMode) => {
    setError("");
    setBusy("question");
    setTranscript("");
    setQuestionAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return "";
    });

    try {
      const response = await fetch(`${QUESTION_API_PATH}?mode=${selectedMode}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { data: Question };
      setQuestion(result.data);
    } catch (cause) {
      setQuestion(null);
      setError(cause instanceof Error ? cause.message : "Không thể lấy câu hỏi ngẫu nhiên.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void loadRandomQuestion("GENERAL");
  }, [loadRandomQuestion]);

  async function readError(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || `Request failed (${response.status}).`;
  }

  async function playQuestion() {
    if (!question) return;

    setError("");
    setBusy("tts");

    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question.prompt_text }),
      });

      if (!response.ok) throw new Error(await readError(response));

      const url = URL.createObjectURL(await response.blob());
      setQuestionAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });

      requestAnimationFrame(() => {
        questionAudioRef.current?.play().catch(() => {
          setError("Trình duyệt đã chặn phát âm thanh. Hãy nhấn nút Play trên audio player.");
        });
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo audio câu hỏi.");
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    setElapsedMs(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Trình duyệt này không hỗ trợ ghi âm bằng MediaRecorder.");
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
      setAnswerBlob(null);
      setAnswerAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return "";
      });

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
      };

      recorder.start();
      setIsRecording(true);
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Bạn cần cho phép truy cập microphone để ghi âm."
          : "Không thể bắt đầu ghi âm.",
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function transcribe() {
    if (!answerBlob) return;

    setError("");
    setTranscript("");
    setElapsedMs(null);
    setBusy("transcribing");
    const startedAt = performance.now();

    try {
      const extension = answerBlob.type.includes("mp4")
        ? "mp4"
        : answerBlob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const formData = new FormData();
      formData.append("audio", answerBlob, `answer.${extension}`);

      const response = await fetch(API_PATH, { method: "POST", body: formData });
      if (!response.ok) throw new Error(await readError(response));

      const result = (await response.json()) as { text: string };
      setTranscript(result.text);
      setElapsedMs(Math.round(performance.now() - startedAt));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể chuyển audio thành văn bản.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>OPENAI SPEECH DEMO</p>
        <h1 style={styles.title}>Question → Voice → Transcript</h1>
        <p style={styles.description}>
          Demo không realtime: nghe câu hỏi, ghi lại toàn bộ câu trả lời, rồi chuyển audio thành
          văn bản.
        </p>

        <div style={styles.section}>
          <span style={styles.step}>1</span>
          <div style={styles.content}>
            <p style={styles.label}>Câu hỏi ngẫu nhiên từ Supabase</p>
            <div style={styles.questionControls}>
              <select
                aria-label="Chế độ luyện tập"
                style={styles.select}
                value={mode}
                disabled={busy !== null || isRecording}
                onChange={(event) => {
                  const selectedMode = event.target.value as PracticeMode;
                  setMode(selectedMode);
                  void loadRandomQuestion(selectedMode);
                }}
              >
                <option value="IELTS">IELTS Speaking</option>
                <option value="TOEIC">TOEIC Speaking</option>
                <option value="GENERAL">General English</option>
              </select>
              <button
                style={styles.secondaryButton}
                onClick={() => void loadRandomQuestion(mode)}
                disabled={busy !== null || isRecording}
              >
                {busy === "question" ? "Đang lấy câu hỏi…" : "Câu khác"}
              </button>
            </div>
            {question ? (
              <div style={styles.questionBox}>
                <p style={styles.questionMeta}>
                  {question.question_type.replaceAll("_", " ")}
                  {question.topic ? ` · ${question.topic.name}` : ""}
                </p>
                {question.group?.shared_context && (
                  <p style={styles.context}>{question.group.shared_context}</p>
                )}
                <p style={styles.question}>{question.prompt_text}</p>
                {question.instruction_text && <p style={styles.instruction}>{question.instruction_text}</p>}
                {question.prompt_items.length > 0 && (
                  <ul style={styles.promptList}>
                    {question.prompt_items.map((item) => <li key={item.sequence_no}>{item.content}</li>)}
                  </ul>
                )}
                <p style={styles.timing}>
                  Chuẩn bị: {question.prep_seconds}s · Trả lời: {question.answer_seconds}s
                </p>
              </div>
            ) : (
              <p style={styles.loadingQuestion}>
                {busy === "question" ? "Đang tải dữ liệu thật…" : "Chưa có câu hỏi."}
              </p>
            )}
            <button
              style={styles.primaryButton}
              onClick={playQuestion}
              disabled={!question || busy !== null || isRecording}
            >
              {busy === "tts" ? "Đang tạo giọng đọc…" : "Phát câu hỏi"}
            </button>
            {questionAudioUrl && (
              <div>
                <audio ref={questionAudioRef} controls src={questionAudioUrl} style={styles.audio} />
                <p style={styles.disclosure}>Giọng đọc này được tạo bởi AI.</p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <span style={styles.step}>2</span>
          <div style={styles.content}>
            <p style={styles.label}>Câu trả lời của bạn</p>
            <div style={styles.actions}>
              <button
                style={styles.primaryButton}
                onClick={startRecording}
                disabled={isRecording || busy !== null}
              >
                Bắt đầu trả lời
              </button>
              <button
                style={styles.stopButton}
                onClick={stopRecording}
                disabled={!isRecording}
              >
                Dừng ghi âm
              </button>
              {isRecording && <span style={styles.recording}>● Đang ghi âm</span>}
            </div>
            {answerAudioUrl && <audio controls src={answerAudioUrl} style={styles.audio} />}
          </div>
        </div>

        <div style={styles.section}>
          <span style={styles.step}>3</span>
          <div style={styles.content}>
            <p style={styles.label}>Transcript</p>
            <button
              style={styles.primaryButton}
              onClick={transcribe}
              disabled={!answerBlob || busy !== null || isRecording}
            >
              {busy === "transcribing" ? "Đang chuyển đổi…" : "Chuyển thành văn bản"}
            </button>
            {(transcript || elapsedMs !== null) && (
              <div style={styles.transcript}>
                <p style={styles.transcriptText}>{transcript || "(Không nhận diện được lời nói)"}</p>
                {elapsedMs !== null && (
                  <p style={styles.timing}>Thời gian xử lý: {(elapsedMs / 1000).toFixed(2)} giây</p>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p role="alert" style={styles.error}>{error}</p>}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "64px 20px",
    background: "linear-gradient(145deg, #eefbf3 0%, #f8faf9 52%, #fff8eb 100%)",
    color: "#143321",
    fontFamily: '"Be Vietnam Pro", sans-serif',
  },
  card: {
    maxWidth: 820,
    margin: "0 auto",
    padding: "40px",
    border: "1px solid #d5e5da",
    borderRadius: 24,
    background: "rgba(255,255,255,.94)",
    boxShadow: "0 24px 70px rgba(30, 75, 46, .12)",
  },
  eyebrow: { margin: 0, color: "#23824a", fontSize: 12, fontWeight: 800, letterSpacing: 1.8 },
  title: { margin: "10px 0 8px", fontSize: 34, lineHeight: 1.2 },
  description: { margin: "0 0 28px", color: "#5a6e61", lineHeight: 1.7 },
  section: {
    display: "flex",
    gap: 16,
    padding: "24px 0",
    borderTop: "1px solid #e4ece7",
  },
  step: {
    display: "grid",
    placeItems: "center",
    flex: "0 0 34px",
    width: 34,
    height: 34,
    borderRadius: 999,
    background: "#daf4e3",
    color: "#19743e",
    fontWeight: 800,
  },
  content: { minWidth: 0, flex: 1 },
  label: { margin: "5px 0 12px", color: "#65776b", fontSize: 13, fontWeight: 700 },
  question: { margin: "0 0 18px", fontSize: 21, fontWeight: 700, lineHeight: 1.5 },
  actions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 },
  questionControls: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  select: {
    minWidth: 210,
    padding: "10px 12px",
    border: "1px solid #b9cec0",
    borderRadius: 10,
    background: "#fff",
    color: "#143321",
    font: "inherit",
  },
  secondaryButton: {
    padding: "10px 16px",
    border: "1px solid #9fc8ad",
    borderRadius: 10,
    background: "#f1faf4",
    color: "#19743e",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  questionBox: {
    marginBottom: 18,
    padding: 18,
    border: "1px solid #dbe8df",
    borderRadius: 12,
    background: "#f7fbf8",
  },
  questionMeta: { margin: "0 0 10px", color: "#23824a", fontSize: 12, fontWeight: 800 },
  context: { margin: "0 0 10px", color: "#52685a", fontStyle: "italic", lineHeight: 1.5 },
  instruction: { margin: "0 0 8px", color: "#52685a", lineHeight: 1.5 },
  promptList: { margin: "0 0 12px", paddingLeft: 22, color: "#52685a", lineHeight: 1.7 },
  loadingQuestion: { margin: "0 0 18px", color: "#65776b" },
  primaryButton: {
    padding: "11px 18px",
    border: 0,
    borderRadius: 10,
    background: "#238a50",
    color: "#fff",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  stopButton: {
    padding: "10px 18px",
    border: "1px solid #d5a2a2",
    borderRadius: 10,
    background: "#fff5f5",
    color: "#a52e2e",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  recording: { color: "#b42318", fontSize: 13, fontWeight: 700 },
  audio: { display: "block", width: "100%", marginTop: 16 },
  disclosure: { margin: "8px 0 0", color: "#718078", fontSize: 12 },
  transcript: {
    marginTop: 16,
    padding: 18,
    borderRadius: 12,
    background: "#f3f8f5",
    border: "1px solid #dbe8df",
  },
  transcriptText: { margin: 0, fontSize: 17, lineHeight: 1.7 },
  timing: { margin: "10px 0 0", color: "#617268", fontSize: 13 },
  error: {
    margin: "12px 0 0",
    padding: 14,
    borderRadius: 10,
    background: "#fff0f0",
    color: "#a12929",
  },
};
