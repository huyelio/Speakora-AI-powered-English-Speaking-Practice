"use server";

import { revalidatePath } from "next/cache";
import { parseLocale } from "../../i18n/config";
import { getRequestUser } from "../../lib/supabase/auth-server";
import { saveProfileLocale, writeLocaleCookie } from "./locale";

/** Guests only get the cookie; signed-in learners also keep the choice on their account. */
export async function setLocale(value: string): Promise<void> {
  const locale = parseLocale(value);
  await writeLocaleCookie(locale);
  const user = await getRequestUser();
  if (user) await saveProfileLocale(user.id, locale);
  revalidatePath("/", "layout");
}
