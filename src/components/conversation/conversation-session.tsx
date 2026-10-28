"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, Keyboard, Lightbulb, Mic, RotateCcw, Send, Square, Star, Volume2, X } from "lucide-react";
import { useAudioRecorder } from "../audio/use-audio-recorder";
import { TTS_CLIENT_TIMEOUT_MS, TTS_RETRY_LABEL, ttsUrl } from "../audio/tts-client";
import type { LocalRecording } from "../audio/audio-recorder";
import { TopicIcon } from "../ui/topic-icon";
import { MIN_ASSESSED_TURNS, conversationCriteria, conversationStars, conversationStats, type ConversationCriterion, type ConversationLevel } from "../../modules/conversation/assessment";
import { scenarioAiName, scenarioCategoryLabels, type ConversationScenario, type ConversationSession, type GoalId } from "../../modules/conversation/scenario";
import "../session-frame/session-frame.css";
import styles from "./conversation.module.css";

/** Topic art that matches each scenario category. */
const categoryIcons: Record<ConversationScenario["category"], string> = {
  Travel: "travel", Everyday: "food-cooking", Work: "work", Social: "social-situations",
};
const criterionLabels: Record<ConversationCriterion, string> = {
  fluency_coherence: "Trôi chảy & mạch lạc", lexical_resource: "Từ vựng", grammatical_range_accuracy: "Ngữ pháp", interaction: "Tương tác",
};
const levelLabels: Record<ConversationLevel, string> = { GOOD: "Tốt", FAIR: "Khá", NEEDS_WORK: "Cần luyện" };

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
  // Shown in the learner's bubble while the turn is being saved; empty means a recording is being recognised.
  const [sentText, setSentText] = useState("");
  const recorder = useAudioRecorder();
  const busy = useRef(false);
  const alive = useRef(true);
  const startId = useRef(initialSessionId);
  const submittedRecording = useRef("");
  const scrollEnd = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceTimer = useRef<number | null>(null);
  const [failedVoice, setFailedVoice] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState("");
  const assessStarted = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  function stopVoice() {
    const audio = audioRef.current;
    if (audio) { audio.onended = null; audio.onerror = null; audio.onplaying = null; audio.pause(); audio.removeAttribute("src"); audio.load(); }
    audioRef.current = null;
    if (voiceTimer.current !== null) window.clearTimeout(voiceTimer.current);
    voiceTimer.current = null;
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
  const scrolled = useRef(false);
  useEffect(() => {
    // The introduction reads from the top; only a running chat follows its newest turn.
    if (!session) return;
    // A finished session opens on its result, not at the end of the transcript.
    if (session.status === "COMPLETED") { resultRef.current?.scrollIntoView({ block: "start" }); return; }
    // Jump on the first render of a loaded session, glide for each new turn afterwards.
    const smooth = scrolled.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollEnd.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    scrolled.current = true;
  }, [session, session?.messages.length, phase, hint]);

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
    : ended ? "Đã kết thúc" : session ? "Đến lượt bạn" : "Sẵn sàng";
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
        setSentText(input.recording ? "" : input.text ?? "");
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
  async function assess() {
    if (!session) return;
    setAssessing(true); setAssessError("");
    try {
      const next = await (await request({ action: "assess", sessionId: session.id })).json() as ConversationSession;
      if (alive.current) setSession(next);
    } catch (reason) { if (alive.current) setAssessError((reason as Error).message); }
    finally { if (alive.current) setAssessing(false); }
  }
  // Each ended session is assessed once per mount; reopening it from history shows the saved result.
  useEffect(() => {
    if (!session || session.status !== "COMPLETED" || session.assessment || session.user_turn_count < MIN_ASSESSED_TURNS) return;
    if (assessStarted.current === session.id) return;
    assessStarted.current = session.id;
    void assess();
    // assess reads the current session; the effect only reacts to a newly ended one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  async function play(messageId: string) {
    if (!session || busy.current || capturing) return;
    busy.current = true; setPhase("voice-loading"); setError(""); setFailedVoice(null);
    // The endpoint streams AI replies, so the media element starts playing on the first bytes
    // instead of waiting for the whole file. Same-origin requests carry the session cookie.
    const audio = new Audio(ttsUrl("conversation", session.id, messageId)); audioRef.current = audio;
    const fail = () => {
      if (audioRef.current !== audio) return;
      if (alive.current) { setError(`Không thể phát giọng AI. Bấm ${TTS_RETRY_LABEL}.`); setFailedVoice(messageId); }
      stopVoice();
    };
    voiceTimer.current = window.setTimeout(fail, TTS_CLIENT_TIMEOUT_MS);
    audio.onplaying = () => {
      if (voiceTimer.current !== null) window.clearTimeout(voiceTimer.current);
      voiceTimer.current = null;
      if (alive.current) setPhase("speaking");
    };
    audio.onended = stopVoice;
    audio.onerror = fail;
    try { await audio.play(); } catch { fail(); }
  }
  function restart() {
    stopVoice(); recorder.clear(); setSession(null); setError(""); setAssessError(""); setText(""); setHint(false); setKeyboard(false);
    startId.current = null;
    if (scenario) setSelectedScenario(scenario);
    window.history.replaceState(null, "", `/speaking/conversation?scenario=${encodeURIComponent(scenario?.key ?? "")}`);
  }

  function newGoals(index: number): GoalId[] {
    const messages = session?.messages ?? [];
    const before = new Set(messages.slice(0, index).flatMap((message) => message.completed_goals));
    return messages[index].completed_goals.filter((goal) => !before.has(goal));
  }

  if (!scenario) return (
    <div className="a5-session">
      <div className="a5-session-top">
        <Link href="/speaking?tab=roleplay" className="a5-round" aria-label="Chọn tình huống khác"><X size={20} aria-hidden="true" /></Link>
        <p className="a5-session-count" role="status">{error || "Đang tải hội thoại…"}</p>
      </div>
      <div className="a5-session-body a5-session-body--single" />
    </div>
  );

  const aiName = scenarioAiName(scenario);
  const level = scenario.difficulty === "BEGINNER" ? "Cơ bản" : "Trung cấp";
  const currentGoal = session && !ended ? scenario.goals.find((goal) => !session.completed_goals.includes(goal.id)) : undefined;
  const visible = session?.messages.filter((message) => message.content) ?? [];
  // The AI line the learner is answering is the large teal bubble, as in the question screens.
  const latestId = !ended && visible.at(-1)?.role === "assistant" ? visible.at(-1)!.id : null;
  const recovery = Boolean(session && !ended && (pending || (error && recorder.recording)) && !working);
  const seconds = Math.floor(recorder.elapsedMs / 1000);
  const deckHint = recording ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} · bấm để gửi`
    : recovery && pending?.processing_status === "PENDING" ? "Thử lại, ghi âm lại hoặc gõ lời thoại"
    : !working && !capturing ? "Bấm mic để nói, bấm lần nữa để gửi" : "";
  const stats = conversationStats(session?.messages ?? []);
  const stars = session ? conversationStars(count, totalGoals, session.user_turn_count) : 0;
  const assessment = session?.assessment ?? null;
  const tooShort = Boolean(ended && session && session.user_turn_count < MIN_ASSESSED_TURNS);
  const goalList = (
    <ul className={styles.goals}>
      {scenario.goals.map((goal) => {
        const done = session?.completed_goals.includes(goal.id);
        return <li key={goal.id} className={done ? styles.goalDone : goal.id === currentGoal?.id ? styles.goalNow : undefined}>
          {done ? <Check size={18} aria-label="Đã xong" /> : <Circle size={18} aria-hidden="true" />}<span>{goal.label}</span>
        </li>;
      })}
    </ul>
  );

  const logView = (
    <div className={styles.log} role="log" aria-label="Lịch sử hội thoại" aria-live="polite" aria-relevant="additions text">
      {visible.map((message) => {
        const index = session!.messages.findIndex((item) => item.id === message.id);
        const achieved = newGoals(index);
        const mine = message.role === "user";
        const latest = message.id === latestId;
        return <React.Fragment key={message.id}>
          <div className={`${styles.message} ${mine ? styles.user : latest ? styles.latest : styles.assistant}`}>
            <span className={styles.speaker}>{mine ? "Bạn" : aiName}</span>
            <p lang="en">{message.content}</p>
            {!mine ? <button className={latest ? "a5-pill-light" : styles.listen} disabled={working || capturing} onClick={() => void play(message.id)} aria-label="Nghe lời thoại AI">
              <Volume2 size={16} aria-hidden="true" />{failedVoice === message.id ? TTS_RETRY_LABEL : "Nghe"}
            </button> : null}
          </div>
          {achieved.length ? <p className={styles.goalChip}><Check size={16} aria-hidden="true" />{message.completed_goals.length === totalGoals ? "Đã hoàn thành tất cả mục tiêu" : `Hoàn thành mục tiêu ${message.completed_goals.length}/${totalGoals}`}</p> : null}
        </React.Fragment>;
      })}
      {phase === "transcribing" ? <div className={`${styles.message} ${styles.user} ${styles.sending}`}>
        <span className={styles.speaker}>Bạn</span>
        {sentText ? <p lang="en">{sentText}</p> : <p className={styles.recognising}>Đang nhận diện lời nói…</p>}
      </div> : null}
      {phase === "generating" ? <div className={`${styles.message} ${styles.assistant}`} role="status">
        <span className={styles.speaker}>{aiName}</span>
        <span className={styles.typing} aria-label={`${aiName} đang trả lời`}><i /><i /><i /></span>
      </div> : null}
    </div>
  );

  return (
    <section className="a5-session" aria-label={`Hội thoại AI: ${scenario.title}`}>
      <div className="a5-session-top">
        <Link href="/speaking?tab=roleplay" className="a5-round" aria-label="Chọn tình huống khác"><X size={20} aria-hidden="true" /></Link>
        <p className="a5-session-count">Hội thoại AI · {scenarioCategoryLabels[scenario.category]} · {level}</p>
        <details className={styles.goalMenu}>
          <summary aria-label={`Mục tiêu ${count}/${totalGoals}`}>
            <span className="a5-dots" aria-hidden="true">
              {scenario.goals.map((goal) => <span key={goal.id} className={session?.completed_goals.includes(goal.id) ? "is-done" : goal.id === currentGoal?.id ? "is-now" : undefined} />)}
            </span>
            <strong>{count}/{totalGoals}</strong>
          </summary>
          <div className={styles.goalPopover}><h3>Mục tiêu</h3>{goalList}</div>
        </details>
        {session && !ended ? <button className="a5-btn a5-btn-ghost a5-btn-sm" disabled={working || capturing} onClick={() => void finish()}>Kết thúc</button> : null}
      </div>

      <div className={`a5-session-body${!session || ended ? " a5-session-body--single" : ""}`}>
        <div className="a5-session-main">
          {!session ? (
            <div className={styles.intro}>
              <header className={styles.introHead}>
                <TopicIcon slug={categoryIcons[scenario.category]} size={96} />
                <div>
                  <p className={styles.eyebrow}>Hội thoại AI · {scenarioCategoryLabels[scenario.category]}</p>
                  <h1 lang="en">{scenario.title}</h1>
                  <ul className="a5-chips"><li>{level}</li><li>{scenario.duration}</li><li>{totalGoals} mục tiêu</li></ul>
                </div>
              </header>
              <section className="a5-bubble" aria-label="Tình huống">
                <p className="a5-bubble-meta">Tình huống</p>
                <p className={styles.situation} lang="en">{scenario.description}</p>
              </section>
              <div className={styles.roles}>
                <div className="a5-box"><p className={styles.roleLabel}>Vai của bạn</p><p lang="en">{scenario.learnerRole}</p></div>
                <div className="a5-box"><p className={styles.roleLabel}>Bạn trò chuyện cùng · <strong>{aiName}</strong></p><p lang="en">{scenario.aiRole}</p></div>
              </div>
              <div className="a5-box"><h3>Mục tiêu của bạn</h3>{goalList}</div>
            </div>
          ) : ended ? null : logView}
          {ended && session ? <>
            <section ref={resultRef} className={`a5-session-card ${styles.result}`} aria-labelledby="roleplay-result">
              {stars ? <p className={styles.stars} role="img" aria-label={`${stars} trên 3 sao`}>
                {[1, 2, 3].map((value) => <Star key={value} size={36} aria-hidden="true" className={value <= stars ? styles.starOn : undefined} fill={value <= stars ? "currentColor" : "none"} />)}
              </p> : null}
              <h2 id="roleplay-result">Đã kết thúc hội thoại</h2>
              <div className={styles.stats}>
                <p><strong>{count}/{totalGoals}</strong><span>mục tiêu</span></p>
                <p><strong>{stats.turns}</strong><span>lượt nói</span></p>
                <p><strong>{stats.averageWords}</strong><span>từ mỗi lượt</span></p>
                <p><strong>{stats.questions}</strong><span>câu hỏi lại</span></p>
                {session.reward_xp ? <p className={styles.xp}><strong>+{session.reward_xp}</strong><span>XP</span></p> : null}
              </div>
              {goalList}
            </section>
            {tooShort ? <p className={styles.notice}>Hội thoại có dưới {MIN_ASSESSED_TURNS} lượt nói nên chưa có nhận xét và XP. Lần sau hãy nói thêm vài lượt nhé.</p> : null}
            {assessing ? <section className="a5-box" role="status"><h3>Đang nhận xét…</h3><span className={styles.typing} aria-hidden="true"><i /><i /><i /></span></section> : null}
            {assessError && !assessing ? <div className={styles.assessError}>
              <p role="alert">{assessError}</p>
              <button className="a5-btn a5-btn-sm" onClick={() => void assess()}>Thử nhận xét lại</button>
            </div> : null}
            {assessment ? <>
              <section className="a5-box"><h3>Nhận xét chung</h3><p className={styles.overall}>{assessment.overall_feedback}</p></section>
              <div className={styles.criteria}>
                {conversationCriteria.map((key) => {
                  const item = assessment.criteria[key];
                  return <article className="a5-box" key={key}>
                    <div className={styles.criterionHead}><h3>{criterionLabels[key]}</h3><span className={`${styles.level} ${styles[`level${item.level}`]}`}>{levelLabels[item.level]}</span></div>
                    <p>{item.summary}</p>
                    {item.example ? <p className={styles.example}><s lang="en">{item.example.original}</s><span lang="en">→ {item.example.corrected}</span></p> : null}
                  </article>;
                })}
              </div>
              {assessment.rewrites.length ? <section className={`a5-lined ${styles.rewrites}`}>
                <h3>Nói tự nhiên hơn</h3>
                {assessment.rewrites.map((item) => <p key={item.original}><s lang="en">{item.original}</s><br /><span lang="en">→ {item.natural}</span></p>)}
              </section> : null}
              {assessment.useful_phrases.length ? <section className="a5-box">
                <h3>Cụm từ nên dùng lần sau</h3>
                <div className="a5-box-words" lang="en">{assessment.useful_phrases.map((phrase) => <span key={phrase}>{phrase}</span>)}</div>
              </section> : null}
            </> : null}
            <details className={styles.transcript}><summary>Xem lại hội thoại</summary>{logView}</details>
          </> : null}
          {hint && session && !ended ? <p className={styles.hint}><Lightbulb size={18} aria-hidden="true" /><span lang="en">{currentGoal?.hint ?? "Keep the conversation going with your own question or thought."}</span></p> : null}
          {error || recorderError ? <p className={styles.error} role="alert">{error || recorderError}</p> : null}
          <div ref={scrollEnd} />
        </div>

        {session && !ended ? <aside className={`a5-session-side ${styles.side}`} aria-label="Thông tin tình huống">
          <div className="a5-box">
            <div className={styles.sideHead}><TopicIcon slug={categoryIcons[scenario.category]} size={56} /><h3 lang="en">{scenario.title}</h3></div>
            <p lang="en">{scenario.description}</p>
            <p>Vai của bạn: <span lang="en">{scenario.learnerRole}</span></p>
          </div>
          <div className="a5-box"><h3>Mục tiêu</h3>{goalList}</div>
        </aside> : null}
      </div>

      <div className="a5-session-actions">
        {!session ? <>
          {error && !working ? <button className="a5-btn a5-btn-ghost" onClick={restart}>Mở tình huống mới</button> : null}
          <button className="a5-btn a5-btn-teal" aria-busy={phase === "loading"} disabled={working} onClick={() => void start()}>
            {phase === "loading" ? "Đang chuẩn bị…" : "Bắt đầu hội thoại"}<ArrowRight size={18} aria-hidden="true" />
          </button>
        </> : ended ? <>
          <Link href="/speaking?tab=roleplay" className="a5-btn a5-btn-ghost">Chọn tình huống khác</Link>
          <button className="a5-btn a5-btn-teal" onClick={restart}><RotateCcw size={18} aria-hidden="true" />Luyện lại tình huống</button>
        </> : <>
          <div className="a5-deck">
            <button className={`a5-knob${recording ? " is-on" : ""}`} disabled={working || recorder.state === "requesting" || recorder.state === "stopping" || pending?.processing_status === "TRANSCRIBED"}
              aria-label={recording ? "Dừng ghi âm và gửi" : "Ghi âm lời thoại"}
              onClick={() => { if (recording) recorder.stop(); else { setError(""); void recorder.start(); } }}>
              <span>{recording ? <Square size={22} fill="currentColor" aria-hidden="true" /> : <Mic size={26} aria-hidden="true" />}</span>
            </button>
            <div className="a5-deck-info"><strong role="status">{status}</strong>{deckHint ? <span>{deckHint}</span> : null}</div>
            <div className="a5-deck-buttons">
              {phase === "speaking" ? <button className="a5-btn a5-btn-ghost a5-btn-sm" onClick={stopVoice}><Square size={16} aria-hidden="true" />Dừng giọng AI</button> : null}
              {recovery ? <button className="a5-btn a5-btn-sm" disabled={capturing} onClick={() => void send({ recording: recorder.recording ?? undefined, text: text.trim() || undefined })}>Thử lại lượt đang chờ</button> : null}
              <button className="a5-round" onClick={() => setHint(!hint)} aria-label="Gợi ý lời thoại" aria-pressed={hint} disabled={working}><Lightbulb size={20} aria-hidden="true" /></button>
              <button className="a5-round" onClick={() => setKeyboard(!keyboard)} aria-label="Nhập lời thoại bằng bàn phím" aria-pressed={keyboard} disabled={working || capturing}><Keyboard size={20} aria-hidden="true" /></button>
            </div>
          </div>
          {keyboard ? <form className={styles.textInput} onSubmit={(event) => { event.preventDefault(); if (text.trim()) void send({ text: text.trim() }); }}>
            <label className={styles.srOnly} htmlFor="roleplay-text">Lời thoại bằng tiếng Anh</label>
            <input id="roleplay-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} placeholder="Type your message in English..." disabled={working || capturing || pending?.processing_status === "TRANSCRIBED"} />
            <button className="a5-round" type="submit" aria-label="Gửi lời thoại" disabled={!text.trim() || working || capturing || pending?.processing_status === "TRANSCRIBED"}><Send size={18} aria-hidden="true" /></button>
          </form> : null}
        </>}
      </div>
    </section>
  );
}
