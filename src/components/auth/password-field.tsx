"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useT } from "../../i18n/client";

export function PasswordField({
  id = "password",
  autoComplete,
  hint,
  label,
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
  const t = useT();
  label ??= t("Mật khẩu");
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
          aria-label={visible ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
          aria-pressed={visible}
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {illustrated ? (visible ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />) : visible ? t("Ẩn") : t("Hiện")}
        </button>
      </div>
      {hint && <p className="auth-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
}
