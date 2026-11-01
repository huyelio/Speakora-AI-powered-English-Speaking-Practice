"use client";

import React, { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Award, BriefcaseBusiness, Check, Globe, GraduationCap, HelpCircle, MessageCircle, Mic, Plane, RotateCcw, Target, TrendingUp, Users, UserRoundCheck } from "lucide-react";
import { cefrOptions, dailyGoalMinutes, learningGoals, type CefrLevel, type LearnerProfile } from "../../modules/profile/types";
import { useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";
import { defaultT, type Translate } from "../../i18n/translate";

export type PreferenceTopic = { id: string; name: string };
export type PreferenceValues = {
  currentLevel: CefrLevel | null;
  learningPurpose: string;
  learningPurposes: string[];
  targetScore: number | null;
  dailyGoalMinutes: number;
  preferredTopics: string[];
};

export function profilePreferences(profile?: LearnerProfile | null, t: Translate = defaultT): PreferenceValues {
  const purpose = learningGoals.find((goal) => goal === profile?.learningPurpose) ?? "Giao tiếp";
  // Old free-text goals were backfilled into the array, but have no checkbox.
  // Never keep invisible selections in the payload sent to strict validation.
  const supportedPurposes = (profile?.learningPurposes?.length ? profile.learningPurposes : [purpose])
    .filter(goal => (learningGoals as readonly string[]).includes(goal))
    .map(goal => goal === "TOEIC" ? "IELTS" : goal);
  const purposes = [...new Set(supportedPurposes.length ? supportedPurposes : [purpose === "TOEIC" ? "IELTS" : purpose])];
  return {
    currentLevel: profile?.currentLevel ?? null,
    learningPurpose: purposes.includes("IELTS") ? "IELTS" : purposes[0],
    learningPurposes: purposes,
    targetScore: purposes.includes("IELTS") ? profile?.targetScore ?? 6.5 : null,
    dailyGoalMinutes: profile?.dailyGoalMinutes ?? 10,
    preferredTopics: profile?.preferredTopics ?? [],
  };
}

const goalOptions = [
  { value: msg("Giao tiếp"), label: msg("Giao tiếp hằng ngày"), description: msg("Tự tin trò chuyện trong cuộc sống"), Icon: MessageCircle },
  { value: msg("Học tập"), label: msg("Học tập"), description: msg("Phục vụ việc học ở trường, đại học"), Icon: GraduationCap },
  { value: msg("Công việc"), label: msg("Công việc"), description: msg("Sử dụng tiếng Anh trong môi trường chuyên nghiệp"), Icon: BriefcaseBusiness },
  { value: msg("Phỏng vấn"), label: msg("Phỏng vấn xin việc"), description: msg("Trả lời phỏng vấn lưu loát, chuyên nghiệp"), Icon: UserRoundCheck },
  { value: "IELTS", label: msg("Luyện thi chứng chỉ"), description: msg("Đạt điểm mục tiêu trong kỳ thi"), Icon: Award },
  { value: msg("Du lịch"), label: msg("Du lịch"), description: msg("Giao tiếp khi đi nước ngoài"), Icon: Plane },
  { value: msg("Du học và định cư"), label: msg("Du học và định cư"), description: msg("Hòa nhập với môi trường quốc tế"), Icon: Globe },
  { value: msg("Thuyết trình, nói trước đám đông"), label: msg("Thuyết trình, nói trước đám đông"), description: msg("Diễn đạt ý tưởng rõ ràng, thuyết phục"), Icon: Mic },
  { value: msg("Kết bạn và giao lưu quốc tế"), label: msg("Kết bạn và giao lưu quốc tế"), description: msg("Kết nối với người nước ngoài"), Icon: Users },
  { value: msg("Phát triển bản thân"), label: msg("Phát triển bản thân"), description: msg("Cải thiện phản xạ, sự tự tin và khả năng diễn đạt"), Icon: TrendingUp },
];

/** The onboarding wizard and Profile edit exactly the same preferences. */
export function LearningPreferenceFields({ values, onChange, topics, section = "all", allowUnknown = true }: {
  values: PreferenceValues;
  onChange: (values: PreferenceValues) => void;
  topics: PreferenceTopic[];
  section?: "level" | "goal" | "rhythm" | "all";
  allowUnknown?: boolean;
}) {
  const t = useT();
  function update(patch: Partial<PreferenceValues>) { onChange({ ...values, ...patch }); }
  return <div className="learning-preferences">
    {(section === "level" || section === "all") && <fieldset className="preference-group">
      <legend>{t("Trình độ tiếng Anh hiện tại")}</legend>
      <div className="cefr-grid">
        {cefrOptions.map((option) => <label className="preference-choice cefr-choice" key={option.value}>
          <input type="radio" name="currentLevel" value={option.value} checked={values.currentLevel === option.value} onChange={() => update({ currentLevel: option.value })} />
          <span className="choice-surface"><span className="cefr-code">{option.value}</span><strong>{t.dynamic(option.label)}</strong><span className="choice-description">{t.dynamic(option.description)}</span><Check className="choice-check" size={16} aria-hidden="true" /></span>
        </label>)}
      </div>
      {allowUnknown && <label className="preference-choice unknown-choice">
        <input type="radio" name="currentLevel" value="unknown" checked={values.currentLevel === null} onChange={() => update({ currentLevel: null })} />
        <span className="choice-surface"><HelpCircle size={21} aria-hidden="true" /><span><strong>{t("Tôi chưa biết trình độ")}</strong><span className="choice-description">{t("Để Speakora gợi ý qua 3 câu nói ngắn.")}</span></span><Check className="choice-check" size={16} aria-hidden="true" /></span>
      </label>}
    </fieldset>}

    {(section === "goal" || section === "all") && <fieldset className="preference-group">
      <legend>{t("Bạn muốn dùng tiếng Anh để làm gì?")}</legend>
      <p className="preference-hint">{t("Chọn một hoặc nhiều nhu cầu.")}</p>
      <div className="learning-goal-grid">
        {goalOptions.map(({ value: goal, label, description, Icon }) => {
          return <label className="preference-choice goal-choice" key={goal}>
            <input type="checkbox" name="learningPurposes" value={goal} checked={values.learningPurposes.includes(goal) || (goal === "IELTS" && values.learningPurposes.includes("TOEIC"))} onChange={(event) => {
              const remaining = values.learningPurposes.filter(item => item !== goal && !(goal === "IELTS" && item === "TOEIC"));
              const selected = event.target.checked ? [...remaining, goal] : remaining;
              update({ learningPurposes: selected, learningPurpose: selected.includes("IELTS") ? "IELTS" : selected[0] ?? "", targetScore: selected.includes("IELTS") ? values.targetScore ?? 6.5 : null });
            }} />
            <span className="choice-surface"><Icon size={22} aria-hidden="true" /><span><strong>{t.dynamic(label)}</strong><span className="choice-description">{t.dynamic(description)}</span></span><Check className="choice-check" size={16} aria-hidden="true" /></span>
          </label>;
        })}
      </div>
      {values.learningPurposes.includes("IELTS") && <div className="ielts-target-field">
        <label htmlFor="target-score"><Target size={19} aria-hidden="true" /> {t("Band mục tiêu IELTS")}</label>
        <select id="target-score" value={values.targetScore ?? 6.5} onChange={(event) => update({ targetScore: Number(event.target.value) })}>
          {Array.from({ length: 9 }, (_, index) => 5 + index / 2).map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}
        </select>
      </div>}
    </fieldset>}

    {(section === "rhythm" || section === "all") && <>
      <fieldset className="preference-group">
        <legend>{t("Bạn dành bao nhiêu phút mỗi ngày?")}</legend>
        <div className="daily-minutes-grid">
          {dailyGoalMinutes.map((minutes) => <label className="preference-choice minute-choice" key={minutes}>
            <input type="radio" name="dailyGoalMinutes" value={minutes} checked={values.dailyGoalMinutes === minutes} onChange={() => update({ dailyGoalMinutes: minutes })} />
            <span className="choice-surface"><strong>{minutes}</strong><span>{t("phút")}</span><Check className="choice-check" size={14} aria-hidden="true" /></span>
          </label>)}
        </div>
        <p className="preference-hint">{t("Mục tiêu của bạn:")} <strong>{values.dailyGoalMinutes} {t("phút mỗi ngày")}</strong>.</p>
      </fieldset>
      <fieldset className="preference-group">
        <legend>{t("Chủ đề nào khiến bạn muốn trò chuyện?")}</legend>
        <p className="preference-hint" id="topics-hint">{t("Chọn ít nhất một chủ đề yêu thích. Có thể chọn nhiều.")}</p>
        <div className="preferred-topic-list" aria-describedby="topics-hint">
          {topics.map((topic) => <label className="preference-choice topic-choice" key={topic.id}>
            <input type="checkbox" name="preferredTopics" value={topic.id} checked={values.preferredTopics.includes(topic.id)} onChange={(event) => update({ preferredTopics: event.target.checked ? [...values.preferredTopics, topic.id] : values.preferredTopics.filter((id) => id !== topic.id) })} />
            <span className="choice-surface"><Check size={15} aria-hidden="true" /><span>{topic.name}</span></span>
          </label>)}
        </div>
        {topics.length === 0 && <p role="status" className="preference-hint">{t("Chưa tải được chủ đề. Hãy tải lại trang để thử lại.")}</p>}
      </fieldset>
    </>}
  </div>;
}

export function ProfileForm({ profile, topics = [] }: { profile: LearnerProfile; topics?: PreferenceTopic[] }) {
  const t = useT();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [values, setValues] = useState(() => profilePreferences(profile, t));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "resetting">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = state === "saving" || state === "resetting";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (values.learningPurposes.length === 0) {
      setError(t("Hãy chọn ít nhất một nhu cầu dùng tiếng Anh."));
      return;
    }
    if (!values.currentLevel || values.preferredTopics.length === 0) {
      setError(t("Hãy chọn trình độ và ít nhất một chủ đề yêu thích."));
      return;
    }
    setState("saving"); setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, displayName, timezone: profile.timezone, completeOnboarding: false }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? t("Không thể lưu hồ sơ."));
      setState("saved"); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("Không thể lưu hồ sơ.")); setState("idle");
    }
  }

  async function resetOnboarding() {
    if (process.env.NODE_ENV === "production" || busy) return;
    setState("resetting"); setError(null);
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset-onboarding" }) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? t("Không thể reset onboarding."));
      window.location.assign("/onboarding");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("Không thể reset onboarding.")); setState("idle");
    }
  }

  return <form className="profile-form profile-preferences-form" onSubmit={submit}>
    <fieldset disabled={busy} className="profile-fields">
      <label htmlFor="profile-name">{t("Tên hiển thị")}</label>
      <input id="profile-name" autoComplete="name" maxLength={80} name="displayName" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
      <LearningPreferenceFields values={values} onChange={(next) => { setValues(next); setState("idle"); }} topics={topics} allowUnknown={false} />
    </fieldset>
    {error && <p className="error" role="alert">{t.dynamic(error)}</p>}
    {state === "saved" && <p className="success-message" role="status">{t("Đã lưu hồ sơ.")}</p>}
    <button className="primary" disabled={busy} type="submit">{state === "saving" ? t("Đang lưu…") : t("Lưu thay đổi")}</button>
    {process.env.NODE_ENV !== "production" && <div className="onboarding-dev-reset">
      <button className="secondary" type="button" disabled={busy} onClick={resetOnboarding}><RotateCcw size={16} aria-hidden="true" />{state === "resetting" ? t("Đang reset…") : "Reset onboarding"}</button>
      <p>{t("Chỉ trong development. Giữ nguyên tài khoản và lịch sử luyện tập.")}</p>
    </div>}
  </form>;
}
