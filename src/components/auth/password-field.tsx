"use client";

import { useState, type ReactNode } from "react";

export function PasswordField({
  id = "password",
  autoComplete,
  hint,
  label = "Mật khẩu",
  labelAction,
}: {
  id?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  label?: string;
  labelAction?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="auth-password-control">
        <input
          aria-describedby={hintId}
          autoComplete={autoComplete}
          id={id}
          minLength={8}
          name="password"
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-controls={id}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {hint && <p className="auth-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
}
