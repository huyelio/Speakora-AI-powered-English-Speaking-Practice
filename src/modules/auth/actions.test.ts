import { beforeEach, expect, it, vi } from "vitest";

const { createAuthServerClient, redirect, signInWithPassword } = vi.hoisted(() => ({
  createAuthServerClient: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../../lib/supabase/auth-server", () => ({ createAuthServerClient }));

import { signIn } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPassword.mockResolvedValue({ error: null });
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

  await expect(signIn(form)).resolves.toEqual({});
  expect(redirect).not.toHaveBeenCalled();
});

it("preserves the normal sign-in redirect", async () => {
  await signIn(validCredentials());

  expect(redirect).toHaveBeenCalledWith("/practice/session-1");
});
