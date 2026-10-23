import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ProfileForm } from "./profile-form";
import { profilePreferences } from "./profile-form";
afterEach(() => vi.unstubAllEnvs());

it("restores multiple selections and IELTS band together", () => {
  const profile = { userId: "learner-1", displayName: "Lan", level: "INTERMEDIATE" as const, learningPurpose: "Công việc", learningPurposes: ["Công việc", "IELTS", "Du lịch"], targetScore: 7, timezone: "UTC", dailyAnswerTarget: 5, onboardingCompletedAt: null };
  expect(profilePreferences(profile)).toMatchObject({ learningPurposes: ["Công việc", "IELTS", "Du lịch"], targetScore: 7 });
  const markup = renderToStaticMarkup(<ProfileForm profile={profile} />);
  expect(markup).toContain("Band mục tiêu IELTS");
  expect(markup.match(/name="learningPurposes"[^>]*checked=""/g)).toHaveLength(3);
});

it("edits structured goals and minutes without exposing timezone or answer targets", () => {
  const markup = renderToStaticMarkup(<ProfileForm profile={{
    userId: "learner-1", displayName: "Lan", level: "INTERMEDIATE",
    learningPurpose: "IELTS", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 10,
    onboardingCompletedAt: "2026-08-21T00:00:00Z",
  }} />);
  expect(markup).toContain("phút mỗi ngày");
  expect(markup).toContain("Band mục tiêu IELTS");
  expect(markup).toContain('type="checkbox" name="learningPurposes"');
  expect(markup).not.toContain('name="dailyAnswerTarget"');
  expect(markup).not.toContain('id="profile-timezone"');
  expect(markup).not.toContain("<textarea");
  expect(markup).toContain("Giao tiếp hằng ngày");
  expect(markup).toContain("Luyện thi chứng chỉ");
  expect(markup).toContain("Du học và định cư");
  expect(markup).toContain("Cải thiện phản xạ, sự tự tin và khả năng diễn đạt");
  expect(markup).not.toContain("Một mục tiêu chính");
  expect(markup).not.toContain("Chọn mức gần với bạn nhất");
  expect(markup).toContain("Lưu thay đổi");
});

it("never renders the onboarding reset in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  const markup = renderToStaticMarkup(<ProfileForm profile={{
    userId: "learner-1", displayName: "Lan", level: "INTERMEDIATE", learningPurpose: "Giao tiếp",
    timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 5, onboardingCompletedAt: "2026-08-21T00:00:00Z",
  }} />);
  expect(markup).not.toContain("Reset onboarding");
});
