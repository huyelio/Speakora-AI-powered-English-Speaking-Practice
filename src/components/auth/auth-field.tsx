import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  labelAction?: ReactNode;
  icon?: ReactNode;
};

export function AuthField({ id, label, hint, labelAction, icon, ...inputProps }: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      {icon ? <div className="auth-icon-control"><span aria-hidden="true" className="auth-input-icon">{icon}</span><input aria-describedby={hintId} id={id} {...inputProps} /></div> : <input aria-describedby={hintId} id={id} {...inputProps} />}
      {hint && <p className="auth-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
}
