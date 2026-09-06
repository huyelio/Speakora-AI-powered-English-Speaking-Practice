import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("../../modules/auth/actions", () => ({
  requestPasswordReset: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  updatePassword: vi.fn(),
}));

import ForgotPasswordPage from "./forgot-password/page";
import SignInPage from "./sign-in/page";
import SignUpPage from "./sign-up/page";
import UpdatePasswordPage from "./update-password/page";

const searchParams = Promise.resolve({ next: "/dashboard" });

async function render(page: (props: { searchParams: typeof searchParams }) => Promise<React.ReactNode>) {
  return renderToStaticMarkup(await page({ searchParams }));
}

it("gives every authentication page the shared learning-focused shell", async () => {
  const pages = await Promise.all([
    render(SignInPage),
    render(SignUpPage),
    render(ForgotPasswordPage),
    render(UpdatePasswordPage),
  ]);

  for (const html of pages) {
    expect(html).toContain('class="auth-shell"');
    expect(html).toContain("Speakora");
    expect(html).toContain('class="auth-card"');
  }
});

it("sends a new account to onboarding when no return path is supplied", async () => {
  const html = renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }));

  expect(html).toContain('name="next"');
  expect(html).toContain('value="/onboarding"');
});

it("keeps password inputs compatible with password managers and exposes a reveal control", async () => {
  const signIn = await render(SignInPage);
  const signUp = await render(SignUpPage);

  expect(signIn).toContain('autoComplete="current-password"');
  expect(signUp).toContain('autoComplete="new-password"');
  expect(signIn).toContain('aria-label="Hiện mật khẩu"');
  expect(signUp).toContain('aria-label="Hiện mật khẩu"');
});

it("connects field hints to their inputs", async () => {
  const signUp = await render(SignUpPage);

  expect(signUp).toContain('aria-describedby="password-hint"');
  expect(signUp).toContain('id="password-hint"');
  expect(signUp).toContain("Ít nhất 8 ký tự");
});
