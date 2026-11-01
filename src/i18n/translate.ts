import { defaultLocale, parseLocale, type Locale } from "./config";
import { en, type MessageKey } from "./en";

type Value = string | number;

function render(text: string, vars: readonly Value[]): string {
  const [one, other] = text.split("|");
  const form = other === undefined || Number(vars[0]) === 1 ? one : other;
  return form.replace(/\{(\d+)\}/g, (_, index: string) => String(vars[Number(index)] ?? ""));
}

export type Translate = {
  (key: MessageKey, ...vars: Value[]): string;
  /** For text only known at runtime, such as a label held in a constant. Unknown text is returned unchanged. */
  dynamic<T extends string | null | undefined>(text: T, ...vars: Value[]): T extends string ? string : T;
};

export function createTranslate(locale: Locale): Translate {
  const lookup = (key: string, vars: readonly Value[]) =>
    render(locale === "en" ? (en as Record<string, string>)[key] ?? key : key, vars);
  const t = ((key: MessageKey, ...vars: Value[]) => lookup(key, vars)) as Translate;
  t.dynamic = ((text: string | null | undefined, ...vars: Value[]) => typeof text === "string" ? lookup(text, vars) : text) as Translate["dynamic"];
  return t;
}

/** Vietnamese, for helpers called without a `t`, as in unit tests. */
export const defaultT = createTranslate(defaultLocale);

/** For browser-only helpers outside React (fetch wrappers), which read the language of the page. */
export function browserT(): Translate {
  return createTranslate(parseLocale(typeof document === "undefined" ? defaultLocale : document.documentElement.lang));
}

/** Marks copy held outside a component, so it is still checked against the dictionary. Render it with `t.dynamic`. */
export function msg<K extends MessageKey>(key: K): K {
  return key;
}
