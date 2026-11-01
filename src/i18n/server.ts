import { cookies } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, defaultLocale, parseLocale, type Locale } from "./config";
import { createTranslate, type Translate } from "./translate";

/** The cookie decides; it is unavailable outside a request, as in unit tests. */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  } catch {
    return defaultLocale;
  }
});

export async function getT(): Promise<Translate> {
  return createTranslate(await getLocale());
}
