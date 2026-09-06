import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProfileForm } from "./profile-form";

it("renders the learner timezone and explains that goal edits are prospective", () => {
  const markup = renderToStaticMarkup(<ProfileForm profile={{
    userId: "learner-1",
    displayName: "Lan",
    level: "INTERMEDIATE",
    learningPurpose: "Travel confidently",
    timezone: "Asia/Ho_Chi_Minh",
    dailyAnswerTarget: 10,
    onboardingCompletedAt: "2026-08-21T00:00:00Z",
  }} />);

  expect(markup).toContain('value="Asia/Ho_Chi_Minh"');
  expect(markup).toContain("future practice days");
  expect(markup).toContain('name="dailyAnswerTarget"');
  expect(markup).toContain("Save profile");
});
