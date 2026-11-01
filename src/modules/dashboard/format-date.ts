import { intlLocale, type Locale } from "../../i18n/config";

/** Date label in the learner's language and timezone; an invalid stored timezone falls back to the runtime default. */
export function formatLearnerDate(value: Date | string, options: Intl.DateTimeFormatOptions, timeZone?: string, locale: Locale = "vi"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    return date.toLocaleDateString(intlLocale(locale), { ...options, timeZone });
  } catch {
    return date.toLocaleDateString(intlLocale(locale), options);
  }
}
