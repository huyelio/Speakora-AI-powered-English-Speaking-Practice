import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const { getRequestUser, redirect } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser }));
vi.mock("../../../components/practice/practice-session", () => ({
  PracticeSession: () => null,
}));

describe("SpeechDemoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("React", React);
  });

  it("sends a signed-in learner to the in-app IELTS page", async () => {
    getRequestUser.mockResolvedValue({ id: "verified-user" });

    const { default: SpeechDemoPage } = await import("./page");

    await expect(SpeechDemoPage()).rejects.toThrow("NEXT_REDIRECT:/ielts");
    expect(redirect).toHaveBeenCalledWith("/ielts");
  });

  it("preserves guest session authorization for an anonymous visitor", async () => {
    getRequestUser.mockResolvedValue(null);

    const { default: SpeechDemoPage } = await import("./page");
    const page = await SpeechDemoPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(page.props.principalKind).toBe("guest");
  });
});
