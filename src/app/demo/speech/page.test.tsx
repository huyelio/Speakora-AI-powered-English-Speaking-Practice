import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const { getRequestUser } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser }));
vi.mock("../../../components/practice/practice-session", () => ({
  PracticeSession: () => null,
}));

describe("SpeechDemoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("React", React);
  });

  it("uses authenticated session authorization for a signed-in learner", async () => {
    getRequestUser.mockResolvedValue({ id: "verified-user" });

    const { default: SpeechDemoPage } = await import("./page");
    const page = await SpeechDemoPage();

    expect(page.props.principalKind).toBe("user");
  });

  it("preserves guest session authorization for an anonymous visitor", async () => {
    getRequestUser.mockResolvedValue(null);

    const { default: SpeechDemoPage } = await import("./page");
    const page = await SpeechDemoPage();

    expect(page.props.principalKind).toBe("guest");
  });
});
