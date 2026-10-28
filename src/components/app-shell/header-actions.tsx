"use client";

import React, { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, CircleUserRound, Flame, History, LogOut, Trophy } from "lucide-react";
import { signOut, type AuthActionResult } from "../../modules/auth/actions";

export type HeaderActionsProps = {
  displayName: string;
  /** Current streak in days; omitted when it could not be loaded. */
  streak?: number | null;
};

/** Streak chip plus the avatar menu (Hồ sơ, Lịch sử luyện tập, Bảng xếp hạng, Đăng xuất). */
export function HeaderActions({ displayName, streak }: HeaderActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [result, action, pending] = useActionState(
    async (_previous: AuthActionResult, data: FormData) => signOut(data),
    { status: "idle" } as AuthActionResult,
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = displayName.trim().charAt(0).toLocaleUpperCase("vi") || "?";

  return (
    <div className="a5-account" ref={rootRef}>
      {typeof streak === "number" && (
        <span className="a5-streak" title="Chuỗi ngày học">
          <Flame aria-hidden="true" size={17} />
          {streak} ngày
        </span>
      )}
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`Tài khoản của ${displayName || "bạn"}`}
        className="a5-avatar-button"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        <span className="a5-avatar" aria-hidden="true">{initial}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      <div className="a5-menu" hidden={!open} id={menuId}>
        <Link href="/profile" onClick={() => setOpen(false)}><CircleUserRound aria-hidden="true" size={18} />Hồ sơ</Link>
        <Link href="/history" onClick={() => setOpen(false)}><History aria-hidden="true" size={18} />Lịch sử luyện tập</Link>
        <Link href="/leaderboard" onClick={() => setOpen(false)}><Trophy aria-hidden="true" size={18} />Bảng xếp hạng</Link>
        <form action={action}>
          <input name="next" type="hidden" value="/auth/sign-in" />
          <button disabled={pending} type="submit">
            <LogOut aria-hidden="true" size={18} />
            {pending ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </form>
      </div>
      {result.status === "error" && <p className="header-action-error" role="alert">{result.error}</p>}
    </div>
  );
}
