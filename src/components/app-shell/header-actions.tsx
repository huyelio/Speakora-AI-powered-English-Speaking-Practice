"use client";

import React, { useActionState } from "react";
import { LogOut } from "lucide-react";
import { signOut, type AuthActionResult } from "../../modules/auth/actions";

export function HeaderActions() {
  const [result, action, pending] = useActionState(
    async (_previous: AuthActionResult, data: FormData) => signOut(data),
    { status: "idle" } as AuthActionResult,
  );
  return (
    <div className="header-actions">
      <form action={action}>
        <input name="next" type="hidden" value="/auth/sign-in" />
        <button className="header-control" disabled={pending} type="submit" aria-label={pending ? "Đang đăng xuất" : "Đăng xuất"} title="Đăng xuất">
          <LogOut size={18} aria-hidden="true" />
          <span>{pending ? "Đang thoát…" : "Đăng xuất"}</span>
        </button>
      </form>
      {result.status === "error" && <p className="header-action-error" role="alert">{result.error}</p>}
    </div>
  );
}
