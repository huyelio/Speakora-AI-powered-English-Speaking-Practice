export type VocabularyMode = "learn" | "review" | "pronounce";

export const vocabularyModes: readonly { mode: VocabularyMode; label: string }[] = [
  { mode: "learn", label: "Học từ mới" },
  { mode: "review", label: "Ôn nhanh" },
  { mode: "pronounce", label: "Phát âm từ" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Unknown or missing modes show the hub overview rather than an error. */
export function parseVocabularyMode(value: string | string[] | undefined): VocabularyMode | null {
  const mode = first(value);
  return mode === "learn" || mode === "review" || mode === "pronounce" ? mode : null;
}

export function parseTopicSlug(value: string | string[] | undefined): string | undefined {
  const slug = first(value)?.trim();
  return slug && /^[a-z0-9-]{1,80}$/.test(slug) ? slug : undefined;
}

export function vocabularyHref(mode: VocabularyMode | null, topic?: string): string {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (topic) params.set("topic", topic);
  const query = params.toString();
  return query ? `/vocabulary?${query}` : "/vocabulary";
}
