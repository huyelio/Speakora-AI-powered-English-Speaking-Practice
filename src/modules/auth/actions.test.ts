import { beforeEach, expect, it, vi } from "vitest";

const { authorizeSession, createAuthServerClient, redirect, signInWithPassword } = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  createAuthServerClient: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../../lib/supabase/auth-server", () => ({ createAuthServerClient }));
vi.mock("../practice/repository", () => ({ authorizeSession }));

import { signIn } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  authorizeSession.mockResolvedValue({ id: "session-1", userId: "user-1" });
  createAuthServerClient.mockResolvedValue({
    auth: { signInWithPassword },
  });
});

function validCredentials() {
  const form = new FormData();
  form.set("email", "learner@example.com");
  form.set("password", "password123");
  form.set("next", "/practice/session-1");
  return form;
}

it("returns after in-place reauthentication without redirecting", async () => {
  const form = validCredentials();
  form.set("reauthenticate", "true");
  form.set("pendingSessionId", "session-1");

  await expect(signIn(form)).resolves.toEqual({});
  expect(authorizeSession).toHaveBeenCalledWith("session-1", { kind: "user", userId: "user-1" });
  expect(redirect).not.toHaveBeenCalled();
});

it("keeps reauthentication in place when the newly signed-in account does not own the pending session", async () => {
  authorizeSession.mockResolvedValue(null);
  const form = validCredentials();
  form.set("reauthenticate", "true");
  form.set("pendingSessionId", "session-1");

  await expect(signIn(form)).resolves.toEqual({
    error: "Tài khoản này không có quyền truy cập phiên luyện đang chờ gửi.",
  });
  expect(redirect).not.toHaveBeenCalled();
});

it("preserves the normal sign-in redirect", async () => {
  await signIn(validCredentials());

  expect(redirect).toHaveBeenCalledWith("/practice/session-1");
});
