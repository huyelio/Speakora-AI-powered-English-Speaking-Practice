export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "vi";
export const LOCALE_COOKIE = "speakora-locale";

export function parseLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? value as Locale : defaultLocale;
}

/** BCP 47 tag for dates and numbers. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "vi-VN";
}

/** The language AI feedback is written in. */
export function feedbackLanguage(locale: Locale): string {
  return locale === "en" ? "English" : "Vietnamese";
}
