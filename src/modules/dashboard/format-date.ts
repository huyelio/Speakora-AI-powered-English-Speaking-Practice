/** vi-VN date label in the learner's timezone; an invalid stored timezone falls back to the runtime default. */
export function formatLearnerDate(value: Date | string, options: Intl.DateTimeFormatOptions, timeZone?: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    return date.toLocaleDateString("vi-VN", { ...options, timeZone });
  } catch {
    return date.toLocaleDateString("vi-VN", options);
  }
}
