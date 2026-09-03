"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "../../lib/supabase/auth-server";
import { getApplicationUrl } from "../../lib/supabase/config";
import { safeReturnPath } from "./redirect";
import { authorizeSession } from "../practice/repository";

const MAX_EMAIL_LENGTH = 320;
const MIN_PASSWORD_LENGTH = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthActionResult = { error: string } | { error?: undefined };

function readEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim();
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && emailPattern.test(email)
    ? email
    : null;
}

function readPassword(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH
    ? value
    : null;
}

function invalidEmail(): AuthActionResult {
  return { error: "Vui lòng nhập email hợp lệ." };
}

function invalidPassword(): AuthActionResult {
  return { error: "Mật khẩu phải có ít nhất 8 ký tự." };
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = readEmail(formData.get("email"));
  if (!email) return invalidEmail();

  const password = readPassword(formData.get("password"));
  if (!password) return invalidPassword();

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Không thể đăng nhập. Vui lòng kiểm tra lại email và mật khẩu." };

  if (formData.get("reauthenticate") === "true") {
    const pendingSessionId = formData.get("pendingSessionId");
    const userId = data.user?.id;
    if (typeof pendingSessionId !== "string" || !pendingSessionId || !userId) {
      return { error: "Không thể xác minh quyền truy cập phiên luyện đang chờ gửi." };
    }
    try {
      const session = await authorizeSession(pendingSessionId, { kind: "user", userId });
      if (!session) {
        return { error: "Tài khoản này không có quyền truy cập phiên luyện đang chờ gửi." };
      }
    } catch {
      return { error: "Không thể xác minh quyền truy cập phiên luyện đang chờ gửi." };
    }
    return {};
  }

  redirect(safeReturnPath(formData.get("next")));
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = readEmail(formData.get("email"));
  if (!email) return invalidEmail();

  const password = readPassword(formData.get("password"));
  if (!password) return invalidPassword();

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };

  redirect(safeReturnPath(formData.get("next")));
}

export async function signOut(formData: FormData): Promise<AuthActionResult> {
  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: "Không thể đăng xuất. Vui lòng thử lại." };

  redirect(safeReturnPath(formData.get("next")));
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult> {
  const email = readEmail(formData.get("email"));
  if (!email) return invalidEmail();

  let appUrl: string;
  try {
    appUrl = getApplicationUrl();
  } catch {
    return { error: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại." };
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });
  if (error) return { error: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại." };

  redirect(safeReturnPath("/auth/sign-in"));
}

export async function updatePassword(
  formData: FormData,
): Promise<AuthActionResult> {
  const password = readPassword(formData.get("password"));
  if (!password) return invalidPassword();

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Không thể cập nhật mật khẩu. Vui lòng thử lại." };

  redirect(safeReturnPath(formData.get("next")));
}
