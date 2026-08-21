import { describe, expect, it, vi } from "vitest";
import {
  initialTimezone,
  resolveBrowserTimezone,
  validateStepControls,
} from "./onboarding-form";

describe("OnboardingForm client behavior", () => {
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
