import "server-only";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "../../i18n/config";
import { getSupabaseAdminClient } from "../../lib/supabase/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function writeLocaleCookie(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
}

/** Keeps the choice on the account. The cookie already applies it, so a failed save is not shown to the learner. */
export async function saveProfileLocale(userId: string, locale: Locale): Promise<void> {
  const { error } = await getSupabaseAdminClient().from("profiles").update({ locale }).eq("user_id", userId);
  if (error) console.error("Unable to save the learner language.");
}

/** After sign-in, brings the account's language to this device. */
export async function restoreLocale(userId: string): Promise<void> {
  const { data, error } = await getSupabaseAdminClient().from("profiles").select("locale").eq("user_id", userId).maybeSingle();
  if (!error && data) await writeLocaleCookie(parseLocale(data.locale));
}
