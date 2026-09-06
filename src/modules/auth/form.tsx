"use client";

import React, { useActionState, type ReactNode } from "react";
import type { AuthActionResult } from "./actions";

type AuthFormProps = {
  action: (formData: FormData) => Promise<AuthActionResult>;
  children: ReactNode;
  submitLabel: string;
};

export function AuthActionFeedback({
  result,
}: {
  result: AuthActionResult;
}) {
  if (result.status === "error") {
    return <p className="auth-feedback auth-feedback-error" role="alert">{result.error}</p>;
  }

  if (result.status === "confirmation-required") {
    return (
      <section className="auth-confirmation" role="status">
        <span aria-hidden="true" className="auth-confirmation-mark">✓</span>
        <div>
          <h2>Kiểm tra email</h2>
          <p>Chúng tôi đã gửi liên kết xác nhận tới <strong>{result.email}</strong>.</p>
          <p>Mở email để hoàn tất đăng ký, sau đó quay lại đăng nhập.</p>
        </div>
        <a className="auth-secondary-link" href="/auth/sign-in">Quay lại đăng nhập</a>
      </section>
    );
  }

  return null;
}

export function AuthForm({ action, children, submitLabel }: AuthFormProps) {
  const [result, formAction, isPending] = useActionState(
    async (_previousState: AuthActionResult, formData: FormData) => action(formData),
    { status: "idle" },
  );

  if (result.status === "confirmation-required") {
    return <AuthActionFeedback result={result} />;
  }

  return (
    <form action={formAction} className="auth-form">
      {children}
      <AuthActionFeedback result={result} />
      {isPending && <p className="auth-pending" role="status">Đang gửi yêu cầu…</p>}
      <button className="auth-submit" disabled={isPending} type="submit">
        {isPending ? "Đang xử lý…" : submitLabel}
      </button>
    </form>
  );
}
