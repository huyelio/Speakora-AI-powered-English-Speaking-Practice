"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signIn } from "../../modules/auth/actions";
import type { AuthActionResult } from "../../modules/auth/actions";

type DialogState = AuthActionResult & { attempts: number };

export function ReauthenticateDialog({
  open,
  sessionId,
  onAuthenticated,
  onCancel,
}: {
  open: boolean;
  sessionId: string;
  onAuthenticated: () => void;
  onCancel: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onAuthenticatedRef = useRef(onAuthenticated);
  const onCancelRef = useRef(onCancel);
  onAuthenticatedRef.current = onAuthenticated;
  onCancelRef.current = onCancel;
  const [result, formAction, pending] = useActionState<DialogState, FormData>(
    async (previous, formData) => {
      formData.set("reauthenticate", "true");
      const next = await signIn(formData);
      if (next.status === "idle") {
        router.refresh();
        onAuthenticatedRef.current();
      }
      return { ...next, attempts: previous.attempts + 1 };
    },
    { status: "idle", attempts: 0 },
  );

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    if (!dialog.open) dialog.showModal();
    emailRef.current?.focus();
    const cancel = (event: Event) => {
      event.preventDefault();
      onCancelRef.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      if (dialog.open) dialog.close();
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;
  return (
    <dialog aria-labelledby="reauth-title" aria-modal="true" className="dialog-backdrop" ref={dialogRef}>
      <section className="reauth-dialog">
        <p className="eyebrow">PHIÊN ĐĂNG NHẬP ĐÃ HẾT HẠN</p>
        <h2 id="reauth-title">Đăng nhập lại để gửi bản ghi</h2>
        <p>Bản ghi vẫn được giữ trên trang này và sẽ dùng lại đúng mã gửi hiện tại.</p>
        <form action={formAction}>
          <input name="next" type="hidden" value={pathname} />
          <input name="pendingSessionId" type="hidden" value={sessionId} />
          <label htmlFor="reauth-email">Email</label>
          <input autoComplete="email" id="reauth-email" name="email" ref={emailRef} required type="email" />
          <label htmlFor="reauth-password">Mật khẩu</label>
          <input autoComplete="current-password" id="reauth-password" minLength={8} name="password" required type="password" />
          {result.status === "error" && <p className="error" role="alert">{result.error}</p>}
          <p className="warning-note">Nếu đóng hoặc tải lại trang, bản ghi chưa gửi sẽ bị mất.</p>
          <div className="button-row">
            <button className="secondary" disabled={pending} onClick={onCancel} type="button">Hủy</button>
            <button className="primary" disabled={pending} type="submit">
              {pending ? "Đang đăng nhập…" : "Đăng nhập và gửi lại"}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  );
}
