"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Mic, Sparkles, Waves } from "lucide-react";
import { LearningPreferenceFields, profilePreferences, type PreferenceTopic } from "../../components/profile/profile-form";
import { PracticeSession } from "../../components/practice/practice-session";
import { ThemeToggle } from "../../components/app-shell/theme-toggle";
import type { LearnerProfile } from "../../modules/profile/types";
import type { ClientPracticeSession } from "../../modules/practice/types";

const steps = ["Về bạn", "Mục tiêu", "Nhịp học", "Luyện nói thử"] as const;
export const initialTimezone = "";
export function resolveBrowserTimezone(readTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone) {
  try { return readTimezone() || "Asia/Ho_Chi_Minh"; } catch { return "Asia/Ho_Chi_Minh"; }
}
type StepControl = Pick<HTMLInputElement, "checkValidity" | "focus">;
export function validateStepControls(controls: Iterable<StepControl>) {
  for (const control of controls) if (!control.checkValidity()) { control.focus(); return false; }
  return true;
}

export function OnboardingForm({ profile = null, topics = [], initialCheck = null, topicsUnavailable = false }: {
  profile?: LearnerProfile | null;
  topics?: PreferenceTopic[];
  initialCheck?: ClientPracticeSession | null;
  topicsUnavailable?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(initialCheck ? 3 : 0);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [values, setValues] = useState(() => profilePreferences(profile));
  const [timezone, setTimezone] = useState(profile?.timezone ?? initialTimezone);
  const [checkSession, setCheckSession] = useState(initialCheck);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!timezone) setTimezone(resolveBrowserTimezone()); }, [timezone]);
  useEffect(() => { stepHeadingRef.current?.focus({ preventScroll: true }); }, [step]);

  async function save(completeOnboarding: boolean, speakingCheckSessionId?: string) {
    const response = await fetch("/api/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, displayName: displayName.trim(), timezone: timezone || resolveBrowserTimezone(), completeOnboarding, ...(speakingCheckSessionId ? { speakingCheckSessionId } : {}) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? "Không thể lưu thiết lập. Hãy thử lại.");
    }
  }

  async function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (step === 1 && values.learningPurposes.length === 0) {
      setError("Hãy chọn ít nhất một nhu cầu dùng tiếng Anh."); return;
    }
    const controls = formRef.current?.querySelectorAll<HTMLInputElement>("[required]") ?? [];
    if (!validateStepControls(controls) || (step === 0 && !displayName.trim())) {
      setError("Hãy nhập tên để Speakora biết cách gọi bạn."); return;
    }
    if (step === 2 && values.preferredTopics.length === 0) {
      setError("Chọn ít nhất một chủ đề bạn thích trước khi tiếp tục."); return;
    }
    setError(null);
    if (step < 2) { setStep(step + 1); return; }
    setBusy(true);
    try { await save(false); setStep(3); } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Không thể lưu thiết lập.");
    } finally { setBusy(false); }
  }

  async function startCheck() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/practice/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKind: "QUICK_CHECK", topicId: values.preferredTopics[0] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Không thể bắt đầu kiểm tra nhanh.");
      const session: ClientPracticeSession = { ...body, currentQuestionIndex: 0, topic: body.questions[0]?.topic ?? null };
      setCheckSession(session);
      window.history.replaceState(null, "", `/onboarding?check=${encodeURIComponent(session.sessionId)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Không thể bắt đầu. Hãy thử lại.");
    } finally { setBusy(false); }
  }

  async function finish(speakingCheckSessionId?: string) {
    if (busy || (!speakingCheckSessionId && values.currentLevel === null)) return;
    setBusy(true); setError(null);
    try { await save(true, speakingCheckSessionId); window.location.assign("/dashboard"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể hoàn tất thiết lập."); setBusy(false); }
  }

  function leaveCheck() {
    setCheckSession(null); setError(null);
    window.history.replaceState(null, "", "/onboarding");
  }

  if (checkSession) return <div className="onboarding-speaking-check">
    <PracticeSession initialSession={checkSession} principalKind="user" onExit={leaveCheck} onQuickCheckComplete={finish} completionPending={busy} />
    {error && <p className="onboarding-error" role="alert">{error}</p>}
  </div>;

  return <div className="onboarding-studio">
    <header className="onboarding-masthead"><a href="/" className="onboarding-wordmark"><Waves size={28} aria-hidden="true" />speakora</a><ThemeToggle /></header>
    <div className="onboarding-layout">
      <aside className="onboarding-intro">
        <span className="onboarding-welcome"><Sparkles size={15} aria-hidden="true" /> MỘT KHỞI ĐẦU RIÊNG CHO BẠN</span>
        <h1>Giúp Speakora hiểu bạn hơn</h1>
        <p>Một vài điều về bạn. Những cuộc trò chuyện gần gũi hơn, từ buổi luyện đầu tiên.</p>
        <ol className="onboarding-journey" aria-label="Tiến trình thiết lập">
          {steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined}>
            <span className="journey-number">{index < step ? <Check size={16} aria-hidden="true" /> : index + 1}</span><span>{label}</span>
          </li>)}
        </ol>
        <div className="onboarding-note"><span className="onboarding-note-icon"><Mic size={24} aria-hidden="true" /></span><p>Không cần nói hoàn hảo.<br /><strong>Cứ bắt đầu bằng chính bạn.</strong></p></div>
      </aside>

      <section className="onboarding-card onboarding-wizard" aria-labelledby="onboarding-step-title" aria-busy={busy}>
        <div className="wizard-progress-label"><span>BƯỚC {step + 1} / {steps.length}</span><span>{steps[step]}</span></div>
        <div className="wizard-progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} /></div>
        <div className="wizard-step-content" key={step}>
          <h2 tabIndex={-1} ref={stepHeadingRef} id="onboarding-step-title">{["Bắt đầu từ bạn", "Bạn đang hướng tới điều gì?", "Tạo nhịp học của riêng bạn", "Thử nói một chút nhé?"][step]}</h2>
          {step < 3 ? <form onSubmit={nextStep} ref={formRef} noValidate>
            <fieldset disabled={busy} className="wizard-fields">
              {step === 0 && <div className="onboarding-name-field"><label htmlFor="display-name">Speakora nên gọi bạn là gì?</label><input id="display-name" autoComplete="name" placeholder="Tên của bạn" maxLength={80} required value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(null); }} aria-describedby={error ? "onboarding-error" : undefined} /></div>}
              <LearningPreferenceFields section={step === 0 ? "level" : step === 1 ? "goal" : "rhythm"} values={values} onChange={(next) => { setValues(next); setError(null); }} topics={topics} />
            </fieldset>
            {step === 2 && topicsUnavailable && <button type="button" className="secondary" onClick={() => window.location.reload()}>Tải lại chủ đề</button>}
            {error && <p className="onboarding-error" id="onboarding-error" role="alert">{error}</p>}
            <div className="onboarding-actions">
              {step > 0 && <button className="wizard-back" disabled={busy} onClick={() => { setError(null); setStep(step - 1); }} type="button"><ArrowLeft size={17} aria-hidden="true" />Quay lại</button>}
              <button className="primary" disabled={busy || (step === 2 && topics.length === 0)} type="submit">{busy ? "Đang lưu…" : "Tiếp tục"}<ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          </form> : <div className="quick-check-intro">
            <p className="quick-check-label"><Mic size={17} aria-hidden="true" /> Quick Speaking Check</p>
            <p>Chỉ 3 câu để Speakora gợi ý trình độ và bước học tiếp theo phù hợp với bạn.</p>
            <ol className="quick-check-outline">
              <li><span>01</span><div><strong>Khởi động nhẹ nhàng</strong><p>Một câu hỏi dễ để bạn làm quen.</p></div></li>
              <li><span>02</span><div><strong>Nói về điều bạn thích</strong><p>{topics.find((topic) => topic.id === values.preferredTopics[0])?.name ?? "Chủ đề yêu thích của bạn"} — bắt đầu từ chuyện gần gũi.</p></div></li>
              <li><span>03</span><div><strong>Chia sẻ góc nhìn</strong><p>Thử giải thích một quan điểm của bạn.</p></div></li>
            </ol>
            <p className="quick-check-reassurance"><Clock3 size={17} aria-hidden="true" /> Khoảng 3–5 phút · Nói tự nhiên, không cần chuẩn bị.</p>
            {values.currentLevel === null && <p className="quick-check-required">Bạn chưa biết trình độ? Hoàn thành 3 câu này để Speakora gợi ý điểm bắt đầu nhé.</p>}
            {error && <p className="onboarding-error" role="alert">{error}</p>}
            <button className="primary quick-check-start" disabled={busy} type="button" onClick={startCheck}><Mic size={18} aria-hidden="true" />{busy ? "Đang chuẩn bị…" : "Kiểm tra nhanh"}</button>
            {values.currentLevel !== null && <button className="quick-check-skip" disabled={busy} type="button" onClick={() => void finish()}>Bỏ qua — bắt đầu với {values.currentLevel}<ArrowRight size={16} aria-hidden="true" /></button>}
            <button className="wizard-back" disabled={busy} type="button" onClick={() => { setError(null); setStep(2); }}><ArrowLeft size={17} aria-hidden="true" />Quay lại</button>
          </div>}
        </div>
      </section>
    </div>
    <p className="onboarding-footer">Một bước nhỏ hôm nay. Tự tin hơn mỗi ngày.</p>
  </div>;
}
