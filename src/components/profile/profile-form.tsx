"use client";

import React, { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, BriefcaseBusiness, Check, GraduationCap, HelpCircle, MessageCircle, Plane, RotateCcw, Target } from "lucide-react";
import { cefrOptions, dailyGoalMinutes, learningGoals, type CefrLevel, type LearnerProfile } from "../../modules/profile/types";

export type PreferenceTopic = { id: string; name: string };
export type PreferenceValues = {
  currentLevel: CefrLevel | null;
  learningPurpose: string;
  targetScore: number | null;
  dailyGoalMinutes: number;
  preferredTopics: string[];
};

export function profilePreferences(profile?: LearnerProfile | null): PreferenceValues {
  const purpose = learningGoals.find((goal) => goal === profile?.learningPurpose) ?? "Giao tiếp";
  return {
    currentLevel: profile?.currentLevel ?? null,
    learningPurpose: purpose,
    targetScore: purpose === "IELTS" ? profile?.targetScore ?? 6.5 : null,
    dailyGoalMinutes: profile?.dailyGoalMinutes ?? 10,
    preferredTopics: profile?.preferredTopics ?? [],
  };
}

const goalIcons = [GraduationCap, BookOpen, MessageCircle, BriefcaseBusiness, Plane, MessageCircle, BookOpen];
const goalHints = ["Sẵn sàng cho kỳ thi", "Tiếng Anh thực tiễn", "Tự tin mỗi ngày", "Kết nối nơi làm việc", "Khám phá thế giới", "Thể hiện bản thân", "Mở rộng kiến thức"];

/** The onboarding wizard and Profile edit exactly the same preferences. */
export function LearningPreferenceFields({ values, onChange, topics, section = "all", allowUnknown = true }: {
  values: PreferenceValues;
  onChange: (values: PreferenceValues) => void;
  topics: PreferenceTopic[];
  section?: "level" | "goal" | "rhythm" | "all";
  allowUnknown?: boolean;
}) {
  function update(patch: Partial<PreferenceValues>) { onChange({ ...values, ...patch }); }
  return <div className="learning-preferences">
    {(section === "level" || section === "all") && <fieldset className="preference-group">
      <legend>Trình độ tiếng Anh hiện tại</legend>
      <p className="preference-hint">Chọn mức gần với bạn nhất. Chưa chắc cũng không sao.</p>
      <div className="cefr-grid">
        {cefrOptions.map((option) => <label className="preference-choice cefr-choice" key={option.value}>
          <input type="radio" name="currentLevel" value={option.value} checked={values.currentLevel === option.value} onChange={() => update({ currentLevel: option.value })} />
          <span className="choice-surface"><span className="cefr-code">{option.value}</span><strong>{option.label}</strong><span className="choice-description">{option.description}</span><Check className="choice-check" size={16} aria-hidden="true" /></span>
        </label>)}
      </div>
      {allowUnknown && <label className="preference-choice unknown-choice">
        <input type="radio" name="currentLevel" value="unknown" checked={values.currentLevel === null} onChange={() => update({ currentLevel: null })} />
        <span className="choice-surface"><HelpCircle size={21} aria-hidden="true" /><span><strong>Tôi chưa biết trình độ</strong><span className="choice-description">Để Speakora gợi ý qua 3 câu nói ngắn.</span></span><Check className="choice-check" size={16} aria-hidden="true" /></span>
      </label>}
    </fieldset>}

    {(section === "goal" || section === "all") && <fieldset className="preference-group">
      <legend>Bạn muốn dùng tiếng Anh để làm gì?</legend>
      <p className="preference-hint">Một mục tiêu chính giúp buổi luyện tập gần với bạn hơn.</p>
      <div className="learning-goal-grid">
        {learningGoals.map((goal, index) => {
          const Icon = goalIcons[index];
          return <label className="preference-choice goal-choice" key={goal}>
            <input type="radio" name="learningPurpose" value={goal} checked={values.learningPurpose === goal} onChange={() => update({ learningPurpose: goal, targetScore: goal === "IELTS" ? values.targetScore ?? 6.5 : null })} />
            <span className="choice-surface"><Icon size={22} aria-hidden="true" /><span><strong>{goal}</strong><span className="choice-description">{goalHints[index]}</span></span><Check className="choice-check" size={16} aria-hidden="true" /></span>
          </label>;
        })}
      </div>
      {values.learningPurpose === "IELTS" && <div className="ielts-target-field">
        <label htmlFor="target-score"><Target size={19} aria-hidden="true" /> Band mục tiêu</label>
        <select id="target-score" value={values.targetScore ?? 6.5} onChange={(event) => update({ targetScore: Number(event.target.value) })}>
          {Array.from({ length: 9 }, (_, index) => 5 + index / 2).map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}
        </select>
      </div>}
    </fieldset>}

    {(section === "rhythm" || section === "all") && <>
      <fieldset className="preference-group">
        <legend>Bạn dành bao nhiêu phút mỗi ngày?</legend>
        <p className="preference-hint">Một chút đều đặn mỗi ngày. Bạn có thể đổi mục tiêu sau.</p>
        <div className="daily-minutes-grid">
          {dailyGoalMinutes.map((minutes) => <label className="preference-choice minute-choice" key={minutes}>
            <input type="radio" name="dailyGoalMinutes" value={minutes} checked={values.dailyGoalMinutes === minutes} onChange={() => update({ dailyGoalMinutes: minutes })} />
            <span className="choice-surface"><strong>{minutes}</strong><span>phút</span><Check className="choice-check" size={14} aria-hidden="true" /></span>
          </label>)}
        </div>
        <p className="preference-hint">Mục tiêu của bạn: <strong>{values.dailyGoalMinutes} phút mỗi ngày</strong>.</p>
      </fieldset>
      <fieldset className="preference-group">
        <legend>Chủ đề nào khiến bạn muốn trò chuyện?</legend>
        <p className="preference-hint" id="topics-hint">Chọn ít nhất một chủ đề yêu thích. Có thể chọn nhiều.</p>
        <div className="preferred-topic-list" aria-describedby="topics-hint">
          {topics.map((topic) => <label className="preference-choice topic-choice" key={topic.id}>
            <input type="checkbox" name="preferredTopics" value={topic.id} checked={values.preferredTopics.includes(topic.id)} onChange={(event) => update({ preferredTopics: event.target.checked ? [...values.preferredTopics, topic.id] : values.preferredTopics.filter((id) => id !== topic.id) })} />
            <span className="choice-surface"><Check size={15} aria-hidden="true" /><span>{topic.name}</span></span>
          </label>)}
        </div>
        {topics.length === 0 && <p role="status" className="preference-hint">Chưa tải được chủ đề. Hãy tải lại trang để thử lại.</p>}
      </fieldset>
    </>}
  </div>;
}

export function ProfileForm({ profile, topics = [] }: { profile: LearnerProfile; topics?: PreferenceTopic[] }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [values, setValues] = useState(() => profilePreferences(profile));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "resetting">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = state === "saving" || state === "resetting";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!values.currentLevel || values.preferredTopics.length === 0) {
      setError("Hãy chọn trình độ và ít nhất một chủ đề yêu thích.");
      return;
    }
    setState("saving"); setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, displayName, timezone: profile.timezone, completeOnboarding: false }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Không thể lưu hồ sơ.");
      setState("saved"); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ."); setState("idle");
    }
  }

  async function resetOnboarding() {
    if (process.env.NODE_ENV === "production" || busy) return;
    setState("resetting"); setError(null);
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset-onboarding" }) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Không thể reset onboarding.");
      window.location.assign("/onboarding");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Không thể reset onboarding."); setState("idle");
    }
  }

  return <form className="profile-form profile-preferences-form" onSubmit={submit}>
    <fieldset disabled={busy} className="profile-fields">
      <label htmlFor="profile-name">Tên hiển thị</label>
      <input id="profile-name" autoComplete="name" maxLength={80} name="displayName" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
      <LearningPreferenceFields values={values} onChange={(next) => { setValues(next); setState("idle"); }} topics={topics} allowUnknown={false} />
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}
    {state === "saved" && <p className="success-message" role="status">Đã lưu hồ sơ.</p>}
    <button className="primary" disabled={busy} type="submit">{state === "saving" ? "Đang lưu…" : "Lưu thay đổi"}</button>
    {process.env.NODE_ENV !== "production" && <div className="onboarding-dev-reset">
      <button className="secondary" type="button" disabled={busy} onClick={resetOnboarding}><RotateCcw size={16} aria-hidden="true" />{state === "resetting" ? "Đang reset…" : "Reset onboarding"}</button>
      <p>Chỉ trong development. Giữ nguyên tài khoản và lịch sử luyện tập.</p>
    </div>}
  </form>;
}
