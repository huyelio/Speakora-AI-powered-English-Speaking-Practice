"use client";

import React, { useState, type FormEvent } from "react";
import type { LearnerLevel, LearnerProfile, ProfileInput } from "../../modules/profile/types";

export function ProfileForm({ profile }: { profile: LearnerProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [level, setLevel] = useState<LearnerLevel>(profile.level);
  const [learningPurpose, setLearningPurpose] = useState(profile.learningPurpose);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [dailyAnswerTarget, setDailyAnswerTarget] = useState(profile.dailyAnswerTarget);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setError(null);
    const payload: ProfileInput = { displayName, level, learningPurpose, timezone, dailyAnswerTarget };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Unable to save your profile.");
      setState("saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
      setState("idle");
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <label htmlFor="profile-name">Display name</label>
      <input id="profile-name" maxLength={80} name="displayName" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />

      <label htmlFor="profile-level">Speaking level</label>
      <select id="profile-level" name="level" onChange={(event) => setLevel(event.target.value as LearnerLevel)} value={level}>
        <option value="BEGINNER">Beginner</option>
        <option value="INTERMEDIATE">Intermediate</option>
        <option value="ADVANCED">Advanced</option>
      </select>

      <label htmlFor="profile-purpose">Learning purpose</label>
      <textarea id="profile-purpose" maxLength={160} name="learningPurpose" onChange={(event) => setLearningPurpose(event.target.value)} required value={learningPurpose} />

      <label htmlFor="profile-timezone">Timezone</label>
      <input id="profile-timezone" maxLength={255} name="timezone" onChange={(event) => setTimezone(event.target.value)} required value={timezone} />

      <label htmlFor="profile-target">Daily answer target</label>
      <input id="profile-target" max={100} min={1} name="dailyAnswerTarget" onChange={(event) => setDailyAnswerTarget(Number(event.target.value))} required type="number" value={dailyAnswerTarget} />
      <p className="form-note">Goal changes apply to future practice days and never rewrite completed daily progress.</p>

      {error && <p className="error" role="alert">{error}</p>}
      {state === "saved" && <p className="success-message" role="status">Profile saved.</p>}
      <button className="primary" disabled={state === "saving"} type="submit">
        {state === "saving" ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

