import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../../components/practice/practice-session", () => ({ PracticeSession: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import {
  OnboardingForm,
  initialTimezone,
  resolveBrowserTimezone,
  validateStepControls,
} from "./onboarding-form";

describe("OnboardingForm client behavior", () => {
  it("starts with accessible CEFR choices and an unknown option, without a timezone field", () => {
    const markup = renderToStaticMarkup(<OnboardingForm />);
    expect(markup).toContain("Giúp Speakora hiểu bạn hơn");
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) expect(markup).toContain(`value="${level}"`);
    expect(markup).toContain("Tôi chưa biết trình độ");
    expect(markup).not.toContain('id="timezone"');
    expect(markup).toContain('type="radio"');
  });
  it("defers the fallback timezone until browser detection is available", () => {
    expect(initialTimezone).toBe("");
    expect(resolveBrowserTimezone(() => "Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(resolveBrowserTimezone(() => "")).toBe("Asia/Ho_Chi_Minh");
  });

  it("keeps the learner on the active step and focuses its first invalid required control", () => {
    const firstControl = { checkValidity: () => false, focus: vi.fn() };
    const laterControl = { checkValidity: () => true, focus: vi.fn() };

    expect(validateStepControls([firstControl, laterControl])).toBe(false);
    expect(firstControl.focus).toHaveBeenCalledOnce();
    expect(laterControl.focus).not.toHaveBeenCalled();
  });
});
