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
  return result.error ? <p role="alert">{result.error}</p> : null;
}

export function AuthForm({ action, children, submitLabel }: AuthFormProps) {
  const [result, formAction, isPending] = useActionState(
    async (_previousState: AuthActionResult, formData: FormData) => action(formData),
    {},
  );

  return (
    <form action={formAction}>
      {children}
      <AuthActionFeedback result={result} />
      {isPending && <p role="status">Đang gửi yêu cầu…</p>}
      <button disabled={isPending} type="submit">{submitLabel}</button>
    </form>
  );
}
