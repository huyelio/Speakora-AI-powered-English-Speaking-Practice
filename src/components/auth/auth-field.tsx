import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  labelAction?: ReactNode;
};

export function AuthField({ id, label, hint, labelAction, ...inputProps }: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <input aria-describedby={hintId} id={id} {...inputProps} />
      {hint && <p className="auth-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
}
