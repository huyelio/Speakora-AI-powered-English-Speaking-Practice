"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { LearnerLevel, ProfileInput } from "../../modules/profile/types";

const fallbackTimezone = "Asia/Ho_Chi_Minh";

const steps = ["Giới thiệu", "Mục tiêu", "Nhịp học"] as const;

function detectedTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone;
}

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [level, setLevel] = useState<LearnerLevel>("BEGINNER");
  const [learningPurpose, setLearningPurpose] = useState("");
  const [timezone, setTimezone] = useState(fallbackTimezone);
  const [dailyAnswerTarget, setDailyAnswerTarget] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTimezone(detectedTimezone());
  }, []);

  function nextStep() {
    setError(null);
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  }

  function previousStep() {
    setError(null);
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== steps.length - 1 || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const payload: ProfileInput = {
      displayName,
      level,
      learningPurpose,
      timezone,
      dailyAnswerTarget,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Không thể lưu thông tin của bạn.");
      }

      window.location.assign("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Không thể lưu thông tin của bạn.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <p className="eyebrow">SPEAKORA</p>
      <h1 id="onboarding-title">Cá nhân hóa hành trình luyện nói</h1>
      <p className="onboarding-lead">Chỉ mất một phút để tạo lộ trình phù hợp với bạn.</p>

      <ol className="onboarding-steps" aria-label="Tiến trình thiết lập">
        {steps.map((label, index) => (
          <li aria-current={index === step ? "step" : undefined} className={index === step ? "active" : ""} key={label}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <form onSubmit={submit}>
        {step === 0 && (
          <fieldset>
            <legend>Hãy bắt đầu với tên của bạn</legend>
            <label htmlFor="display-name">Tên hiển thị</label>
            <input
              autoComplete="name"
              id="display-name"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </fieldset>
        )}

        {step === 1 && (
          <fieldset>
            <legend>Bạn đang học tiếng Anh vì điều gì?</legend>
            <label htmlFor="learner-level">Trình độ hiện tại</label>
            <select id="learner-level" onChange={(event) => setLevel(event.target.value as LearnerLevel)} value={level}>
              <option value="BEGINNER">Mới bắt đầu</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
            <label htmlFor="learning-purpose">Mục tiêu học</label>
            <textarea
              id="learning-purpose"
              maxLength={160}
              onChange={(event) => setLearningPurpose(event.target.value)}
              required
              value={learningPurpose}
            />
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>Thiết lập nhịp luyện tập</legend>
            <label htmlFor="daily-answer-target">Số câu trả lời mỗi ngày</label>
            <input
              id="daily-answer-target"
              max={100}
              min={1}
              onChange={(event) => setDailyAnswerTarget(Number(event.target.value))}
              required
              type="number"
              value={dailyAnswerTarget}
            />
            <label htmlFor="timezone">Múi giờ</label>
            <input
              id="timezone"
              onChange={(event) => setTimezone(event.target.value)}
              required
              value={timezone}
            />
          </fieldset>
        )}

        {error && <p className="onboarding-error" role="alert">{error}</p>}
        {isSubmitting && <p role="status">Đang lưu thiết lập…</p>}

        <div className="onboarding-actions">
          {step > 0 && <button className="secondary" onClick={previousStep} type="button">Quay lại</button>}
          {step < steps.length - 1 ? (
            <button className="primary" onClick={nextStep} type="button">Tiếp tục</button>
          ) : (
            <button className="primary" disabled={isSubmitting} type="submit">Hoàn tất</button>
          )}
        </div>
      </form>
    </section>
  );
}
