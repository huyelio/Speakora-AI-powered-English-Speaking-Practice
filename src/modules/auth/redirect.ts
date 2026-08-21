export function safeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\\\x00-\x1F\x7F]/.test(path)
    ? path
    : "/dashboard";
}
