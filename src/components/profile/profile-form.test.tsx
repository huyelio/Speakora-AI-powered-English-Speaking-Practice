import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ProfileForm } from "./profile-form";
afterEach(() => vi.unstubAllEnvs());

it("edits structured goals and minutes without exposing timezone or answer targets", () => {
  const markup = renderToStaticMarkup(<ProfileForm profile={{
    userId: "learner-1", displayName: "Lan", level: "INTERMEDIATE",
    learningPurpose: "IELTS", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 10,
    onboardingCompletedAt: "2026-08-21T00:00:00Z",
  }} />);
  expect(markup).toContain("phút mỗi ngày");
  expect(markup).toContain("Band mục tiêu");
  expect(markup).not.toContain('name="dailyAnswerTarget"');
  expect(markup).not.toContain('id="profile-timezone"');
  expect(markup).not.toContain("<textarea");
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
