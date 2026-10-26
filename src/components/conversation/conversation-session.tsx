"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Check, Keyboard, Lightbulb, Mic, MessagesSquare, Send, Square, Volume2 } from "lucide-react";
import { useAudioRecorder } from "../audio/use-audio-recorder";
import type { LocalRecording } from "../audio/audio-recorder";
import { type ConversationScenario, type ConversationSession, type GoalId } from "../../modules/conversation/scenario";
import styles from "./conversation.module.css";

type Phase = "idle" | "loading" | "transcribing" | "generating" | "voice-loading" | "speaking";
async function request(body: Record<string, unknown> | FormData) {
  const response = await fetch("/api/conversation", {
    method: "POST", ...(body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error || "Không thể kết nối. Hãy thử lại.");
  }
  return response;
}
async function loadSession(id: string) {
  const response = await fetch(`/api/conversation?sessionId=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error || "Không thể tải hội thoại.");
  }
  return await response.json() as ConversationSession;
}

export function ConversationSessionView({ initialSessionId, initialScenario }: { initialSessionId: string | null; initialScenario?: ConversationScenario }) {
  const [selectedScenario, setSelectedScenario] = useState(initialScenario);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [phase, setPhase] = useState<Phase>(initialSessionId ? "loading" : "idle");
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [text, setText] = useState("");
  const recorder = useAudioRecorder();
  const busy = useRef(false);
  const alive = useRef(true);
  const startId = useRef(initialSessionId);
  const submittedRecording = useRef("");
  const scrollEnd = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);

  function stopVoice() {
    const audio = audioRef.current;
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); }
    audioRef.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    busy.current = false;
    if (alive.current) setPhase("idle");
  }
  useEffect(() => {
    alive.current = true;
    if (initialSessionId) {
      busy.current = true;
      loadSession(initialSessionId).then((value) => { if (alive.current) setSession(value); })
        .catch((reason: Error) => { if (alive.current) setError(reason.message); })
        .finally(() => { busy.current = false; if (alive.current) setPhase("idle"); });
    }
    return () => { alive.current = false; stopVoice(); };
    // Initial route state is read once; URL replacement preserves this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);
  useEffect(() => { scrollEnd.current?.scrollIntoView({ block: "end", behavior: "auto" }); }, [session?.messages.length, phase]);

  const scenario = session?.scenario ?? selectedScenario;
  const totalGoals = scenario?.goals.length ?? 0;
  const recording = recorder.state === "recording";
  const capturing = ["requesting", "recording", "stopping"].includes(recorder.state);
  const working = phase !== "idle";
  const pending = session?.messages.find((message) => message.id === session.pending_message_id);
  const ended = session?.status === "COMPLETED";
  const count = session?.completed_goals.length ?? 0;
  const status = recording ? "Đang nghe..." : recorder.state === "requesting" ? "Đang mở microphone..."
    : recorder.state === "stopping" || phase === "transcribing" ? "Đang nhận diện..."
    : phase === "generating" ? "AI đang trả lời..." : phase === "speaking" ? "AI đang nói..."
    : phase === "voice-loading" ? "Đang tải giọng AI..." : phase === "loading" ? "Đang tải hội thoại..."
    : ended ? "Đã kết thúc" : session ? "Đến lượt bạn" : "Role-playing · Thử nghiệm";
  const recorderError = recorder.error ? ({ MIC_DENIED: "Hãy cho phép microphone trong trình duyệt.", UNSUPPORTED: "Trình duyệt chưa hỗ trợ ghi âm. Bạn có thể nhập lời thoại.", EMPTY_RECORDING: "Bản ghi trống. Hãy thử lại.", RECORDING_FAILED: "Không thể ghi âm. Hãy thử lại." }[recorder.error]) : "";

  async function start() {
    if (busy.current || !scenario) return;
    busy.current = true; setPhase("loading"); setError("");
    const id = startId.current ?? crypto.randomUUID(); startId.current = id;
    try {
      const next = await (await request({ action: "create", sessionId: id, scenarioKey: scenario.key })).json() as ConversationSession;
      if (!alive.current) return;
      setSession(next);
      window.history.replaceState(null, "", `/speaking/conversation?session=${id}`);
    } catch (reason) { if (alive.current) setError((reason as Error).message); }
    finally { busy.current = false; if (alive.current) setPhase("idle"); }
  }

  async function send(input: { recording?: LocalRecording; text?: string } = {}) {
    if (!session || busy.current || ended || capturing) return;
    busy.current = true; setError(""); setHint(false);
    const sessionId = session.id;
    const messageId = session.pending_message_id ?? input.recording?.idempotencyKey ?? crypto.randomUUID();
    try {
      let current = session;
      if (!pending || pending.processing_status === "PENDING") {
        setPhase("transcribing");
        let body: Record<string, unknown> | FormData;
        if (input.recording) {
          const form = new FormData();
          form.set("sessionId", sessionId); form.set("messageId", messageId);
          form.set("audio", input.recording.blob, "answer");
          form.set("replaceAudio", String(input.recording.idempotencyKey !== messageId));
          body = form;
        } else body = { action: "transcribe", sessionId, messageId, ...(input.text ? { text: input.text } : {}) };
        current = await (await request(body)).json() as ConversationSession;
        if (!alive.current) return;
        setSession(current); setText(""); recorder.clear();
      }
      if (current.pending_message_id) {
        setPhase("generating");
        const next = await (await request({ action: "reply", sessionId, messageId: current.pending_message_id })).json() as ConversationSession;
        if (alive.current) setSession(next);
      }
    } catch (reason) {
      if (alive.current) {
        setError((reason as Error).message);
        // Discover a persisted turn even when its HTTP response was lost.
        await loadSession(sessionId).then((value) => { if (alive.current) setSession(value); }).catch(() => {});
      }
    } finally { busy.current = false; if (alive.current) setPhase("idle"); }
  }
  useEffect(() => {
    const local = recorder.recording;
    if (recorder.state === "review" && local && submittedRecording.current !== local.idempotencyKey && !busy.current) {
      submittedRecording.current = local.idempotencyKey;
      void send({ recording: local });
    }
    // One submission per newly finished recording; retry is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.recording]);

  async function finish() {
    if (!session || busy.current || capturing) return;
    busy.current = true; setPhase("loading"); setError("");
    try {
      const next = await (await request({ action: "end", sessionId: session.id })).json() as ConversationSession;
      if (alive.current) { setSession(next); recorder.clear(); }
    } catch (reason) { if (alive.current) setError((reason as Error).message); }
    finally { busy.current = false; if (alive.current) setPhase("idle"); }
  }
  async function play(messageId: string) {
    if (!session || busy.current || capturing) return;
    busy.current = true; setPhase("voice-loading"); setError("");
    try {
      const response = await request({ action: "tts", sessionId: session.id, messageId });
      const blob = await response.blob();
      if (!alive.current) return;
      const url = URL.createObjectURL(blob); audioUrl.current = url;
      const audio = new Audio(url); audioRef.current = audio;
      audio.onended = stopVoice;
      audio.onerror = () => { setError("Không thể phát giọng AI. Hãy thử lại."); stopVoice(); };
      setPhase("speaking");
      await audio.play();
    } catch { if (alive.current) setError("Không thể phát giọng AI. Bấm nghe lại để thử."); stopVoice(); }
  }
  function restart() {
    stopVoice(); recorder.clear(); setSession(null); setError(""); setText(""); setHint(false); setKeyboard(false);
    startId.current = null;
    if (scenario) setSelectedScenario(scenario);
    window.history.replaceState(null, "", `/speaking/conversation?scenario=${encodeURIComponent(scenario?.key ?? "")}`);
  }

  function newGoals(index: number): GoalId[] {
    const messages = session?.messages ?? [];
    const before = new Set(messages.slice(0, index).flatMap((message) => message.completed_goals));
    return messages[index].completed_goals.filter((goal) => !before.has(goal));
  }

  if (!scenario) return <section className={styles.frame}><p role="status">{error || "Đang tải hội thoại…"}</p><Link href="/speaking?tab=roleplay">Chọn tình huống khác</Link></section>;

  return (
    <section className={styles.frame} aria-label={`Hội thoại AI: ${scenario.title}`}>
      <header className={styles.header}>
        <Link href="/speaking?tab=roleplay" className={styles.iconButton} aria-label="Chọn tình huống khác"><ArrowLeft size={20} /></Link>
        <span className={styles.avatar} aria-hidden="true"><Bot size={24} /></span>
        <div className={styles.character}><strong>Speakora AI</strong><span role="status">{status}</span></div>
        <details className={styles.goalMenu}>
          <summary aria-label={`Mục tiêu ${count}/${totalGoals}`}>{count}/{totalGoals}</summary>
          <ul>{scenario.goals.map((goal) => <li key={goal.id}>{session?.completed_goals.includes(goal.id) ? "✓ " : "○ "}{goal.label}</li>)}</ul>
        </details>
        {session && !ended ? <button className={styles.endButton} disabled={working || capturing} onClick={() => void finish()}>Kết thúc</button> : null}
      </header>

      <div className={styles.history}>
        {!session ? (
          <article className={styles.scenario}>
            <div className={styles.scenarioTitle}><span className={styles.plane}><MessagesSquare size={30} /></span><div><p>Hội thoại AI · {scenario.category}</p><h1>{scenario.title}</h1><span>{scenario.duration}</span></div></div>
            <p className={styles.description} lang="en">{scenario.description}</p>
            <p className={styles.introHint}>Vai của bạn: {scenario.learnerRole}</p>
            <button className="primary" disabled={working} onClick={() => void start()}>Bắt đầu hội thoại</button>
          </article>
        ) : (
          <>
            <p className={styles.sceneLabel}><MessagesSquare size={15} aria-hidden="true" /> {scenario.title} · {scenario.category}</p>
            <div role="log" aria-label="Lịch sử hội thoại" aria-live="polite" aria-relevant="additions text">
              {session.messages.filter((message) => message.content).map((message) => {
                const index = session.messages.findIndex((item) => item.id === message.id);
                const achieved = newGoals(index);
                return <React.Fragment key={message.id}>
                  <div className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}>
                    <span className={styles.speaker}>{message.role === "user" ? "Bạn" : "Speakora AI"}</span>
                    <p lang="en">{message.content}</p>
                    {message.role === "assistant" ? <button className={styles.listen} disabled={working || capturing} onClick={() => void play(message.id)} aria-label="Nghe lời thoại AI"><Volume2 size={16} /> Nghe</button> : null}
                  </div>
                  {achieved.length ? <p className={styles.system}><Check size={16} aria-hidden="true" /> {message.completed_goals.length === totalGoals ? "Đã hoàn thành tất cả mục tiêu" : `Hoàn thành mục tiêu ${message.completed_goals.length}/${totalGoals}`}</p> : null}
                </React.Fragment>;
              })}
            </div>
            {phase === "generating" ? <p className={styles.thinking} role="status">AI đang trả lời...</p> : null}
            {ended ? <section className={styles.result}>
              <Check size={28} aria-hidden="true" /><h2>Đã kết thúc hội thoại</h2>
              <p>{session.user_turn_count} lượt nói · {count}/{totalGoals} mục tiêu đã hoàn thành</p>
              <ul>{scenario.goals.map((goal) => <li key={goal.id}>{session.completed_goals.includes(goal.id) ? "✓ " : "○ "}{goal.label}</li>)}</ul>
              <button className="primary" onClick={restart}>Luyện lại tình huống</button><Link href="/speaking?tab=roleplay" className="secondary">Chọn tình huống khác</Link>
            </section> : null}
          </>
        )}
        <div ref={scrollEnd} />
      </div>

      <footer className={styles.controls}>
        {error || recorderError ? <p className={styles.error} role="alert">{error || recorderError}</p> : null}
        {session && !ended && (pending || (error && recorder.recording)) && !working ? <div className={styles.recovery}>
          <button className="secondary" disabled={capturing} onClick={() => void send({ recording: recorder.recording ?? undefined, text: text.trim() || undefined })}>Thử lại lượt đang chờ</button>
          {pending?.processing_status === "PENDING" ? <span>Hoặc ghi âm lại / nhập lời thoại.</span> : null}
        </div> : null}
        {!session && error && !working ? <button className="secondary" onClick={restart}>Mở tình huống mới</button> : null}
        {phase === "speaking" ? <button className="secondary" onClick={stopVoice}><Square size={16} /> Dừng giọng AI</button> : null}
        {hint && session && !ended ? <p className={styles.hint} lang="en">{scenario.goals.find((goal) => !session.completed_goals.includes(goal.id))?.hint ?? "Keep the conversation going with your own question or thought."}</p> : null}
        {session && !ended ? <>
          <div className={styles.micRow}>
            <button className={styles.iconButton} onClick={() => setHint(!hint)} aria-label="Gợi ý lời thoại" aria-pressed={hint} disabled={working}><Lightbulb size={22} /></button>
            <button className={`${styles.mic} ${recording ? styles.recording : ""}`} disabled={working || recorder.state === "requesting" || recorder.state === "stopping" || pending?.processing_status === "TRANSCRIBED"}
              aria-label={recording ? "Dừng ghi âm và gửi" : "Ghi âm lời thoại"}
              onClick={() => { if (recording) recorder.stop(); else { setError(""); void recorder.start(); } }}>
              {recording ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
            </button>
            <button className={styles.iconButton} onClick={() => setKeyboard(!keyboard)} aria-label="Nhập lời thoại bằng bàn phím" aria-pressed={keyboard} disabled={working || capturing}><Keyboard size={22} /></button>
          </div>
          <p className={styles.micStatus} role="status">{recording ? `${status} ${Math.floor(recorder.elapsedMs / 1000)}s · Bấm để gửi` : working ? status : "Bấm mic để nói · Bấm lần nữa để gửi"}</p>
          {keyboard ? <form className={styles.textInput} onSubmit={(event) => { event.preventDefault(); if (text.trim()) void send({ text: text.trim() }); }}>
            <label className={styles.srOnly} htmlFor="roleplay-text">Lời thoại bằng tiếng Anh</label>
            <input id="roleplay-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} placeholder="Type your message in English..." disabled={working || capturing || pending?.processing_status === "TRANSCRIBED"} />
            <button className={styles.iconButton} type="submit" aria-label="Gửi lời thoại" disabled={!text.trim() || working || capturing || pending?.processing_status === "TRANSCRIBED"}><Send size={20} /></button>
          </form> : null}
        </> : !session ? <p className={styles.micStatus}>Một tình huống thực tế. Một cuộc trò chuyện của bạn.</p> : <Link href="/speaking?tab=roleplay" className="secondary">Quay lại Luyện nói</Link>}
      </footer>
    </section>
  );
}
