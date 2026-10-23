"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function PasswordField({
  id = "password",
  autoComplete,
  hint,
  label = "Mật khẩu",
  labelAction,
  illustrated = true,
}: {
  id?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  label?: string;
  labelAction?: ReactNode;
  illustrated?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className={`auth-password-control${illustrated ? " auth-icon-control" : ""}`}>
        {illustrated && <LockKeyhole className="auth-input-icon" size={21} aria-hidden="true" />}
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
          {illustrated ? (visible ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />) : visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {hint && <p className="auth-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
}
