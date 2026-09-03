"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signIn } from "../../modules/auth/actions";
import type { AuthActionResult } from "../../modules/auth/actions";

type DialogState = AuthActionResult & { attempts: number };

export function ReauthenticateDialog({
  open,
  onAuthenticated,
  onCancel,
}: {
  open: boolean;
  onAuthenticated: () => void;
  onCancel: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [result, formAction, pending] = useActionState<DialogState, FormData>(
    async (previous, formData) => {
      formData.set("reauthenticate", "true");
      const next = await signIn(formData);
      if (!next.error) {
        router.refresh();
        onAuthenticated();
      }
      return { ...next, attempts: previous.attempts + 1 };
    },
    { attempts: 0 },
  );

  useEffect(() => {
    if (!open) return;
    emailRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop">
      <section aria-labelledby="reauth-title" aria-modal="true" className="reauth-dialog" role="dialog">
        <p className="eyebrow">PHIÊN ĐĂNG NHẬP ĐÃ HẾT HẠN</p>
        <h2 id="reauth-title">Đăng nhập lại để gửi bản ghi</h2>
        <p>Bản ghi vẫn được giữ trên trang này và sẽ dùng lại đúng mã gửi hiện tại.</p>
        <form action={formAction}>
          <input name="next" type="hidden" value={pathname} />
          <label htmlFor="reauth-email">Email</label>
          <input autoComplete="email" id="reauth-email" name="email" ref={emailRef} required type="email" />
          <label htmlFor="reauth-password">Mật khẩu</label>
          <input autoComplete="current-password" id="reauth-password" minLength={8} name="password" required type="password" />
          {result.error && <p className="error" role="alert">{result.error}</p>}
          <p className="warning-note">Nếu đóng hoặc tải lại trang, bản ghi chưa gửi sẽ bị mất.</p>
          <div className="button-row">
            <button className="secondary" disabled={pending} onClick={onCancel} type="button">Hủy</button>
            <button className="primary" disabled={pending} type="submit">
              {pending ? "Đang đăng nhập…" : "Đăng nhập và gửi lại"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
