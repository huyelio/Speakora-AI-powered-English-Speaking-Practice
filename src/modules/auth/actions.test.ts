import { beforeEach, expect, it, vi } from "vitest";

const {
  authorizeSession,
  createAuthServerClient,
  getApplicationUrl,
  redirect,
  signInWithPassword,
  signUpWithPassword,
} = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  createAuthServerClient: vi.fn(),
  getApplicationUrl: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../../lib/supabase/auth-server", () => ({ createAuthServerClient }));
vi.mock("../../lib/supabase/config", () => ({ getApplicationUrl }));
vi.mock("../practice/repository", () => ({ authorizeSession }));

import { signIn, signUp } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  getApplicationUrl.mockReturnValue("http://localhost:3000");
  signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  signUpWithPassword.mockResolvedValue({
    data: { user: { id: "user-1" }, session: { access_token: "access-token" } },
    error: null,
  });
  authorizeSession.mockResolvedValue({ id: "session-1", userId: "user-1" });
  createAuthServerClient.mockResolvedValue({
    auth: { signInWithPassword, signUp: signUpWithPassword },
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

  await expect(signIn(form)).resolves.toEqual({ status: "idle" });
  expect(authorizeSession).toHaveBeenCalledWith("session-1", { kind: "user", userId: "user-1" });
  expect(redirect).not.toHaveBeenCalled();
});

it("keeps reauthentication in place when the newly signed-in account does not own the pending session", async () => {
  authorizeSession.mockResolvedValue(null);
  const form = validCredentials();
  form.set("reauthenticate", "true");
  form.set("pendingSessionId", "session-1");

  await expect(signIn(form)).resolves.toEqual({
    status: "error",
    error: "Tài khoản này không có quyền truy cập phiên luyện đang chờ gửi.",
  });
  expect(redirect).not.toHaveBeenCalled();
});

it("preserves the normal sign-in redirect", async () => {
  await signIn(validCredentials());

  expect(redirect).toHaveBeenCalledWith("/practice/session-1");
});

it("explains that a matching account still needs email confirmation", async () => {
  signInWithPassword.mockResolvedValue({
    data: { user: null },
    error: { code: "email_not_confirmed", message: "Email not confirmed" },
  });

  await expect(signIn(validCredentials())).resolves.toEqual({
    status: "error",
    error: "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.",
  });
  expect(redirect).not.toHaveBeenCalled();
});

it("redirects an immediately authenticated registration to its safe return path", async () => {
  await signUp(validCredentials());

  expect(signUpWithPassword).toHaveBeenCalledWith({
    email: "learner@example.com",
    password: "password123",
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fpractice%2Fsession-1",
    },
  });
  expect(redirect).toHaveBeenCalledWith("/practice/session-1");
});

it("keeps registration in place when email confirmation is required", async () => {
  signUpWithPassword.mockResolvedValue({
    data: { user: { id: "user-1" }, session: null },
    error: null,
  });

  await expect(signUp(validCredentials())).resolves.toEqual({
    status: "confirmation-required",
    email: "learner@example.com",
  });
  expect(redirect).not.toHaveBeenCalled();
});
