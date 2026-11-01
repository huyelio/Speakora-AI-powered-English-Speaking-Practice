import { describe, expect, it } from "vitest";
import { feedbackLanguage, parseLocale } from "./config";
import { en } from "./en";
import { createTranslate, defaultT } from "./translate";

describe("createTranslate", () => {
  const t = createTranslate("en");

  it("keeps the Vietnamese source by default", () => {
    expect(defaultT("Hồ sơ")).toBe("Hồ sơ");
    expect(defaultT("Hạng {0}", 3)).toBe("Hạng 3");
  });

  it("translates, fills placeholders and picks plurals", () => {
    expect(t("Hồ sơ")).toBe("Profile");
    expect(t("Hạng {0}", 3)).toBe("Rank 3");
    expect(t("{0} từ mới", 1)).toBe("1 new word");
    expect(t("{0} từ mới", 4)).toBe("4 new words");
  });

  it("translates known runtime text, passes the rest and keeps nullish values", () => {
    expect(t.dynamic("Cơ bản")).toBe("Basic");
    expect(t.dynamic("not in the dictionary")).toBe("not in the dictionary");
    expect(t.dynamic(null)).toBeNull();
  });

  it("gives every placeholder in a key a place in its translation", () => {
    for (const [key, value] of Object.entries(en)) {
      for (const slot of key.match(/\{\d+\}/g) ?? []) expect(value, key).toContain(slot);
    }
  });
});

describe("locale config", () => {
  it("falls back to Vietnamese and names the feedback language", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("fr")).toBe("vi");
    expect(parseLocale(undefined)).toBe("vi");
    expect(feedbackLanguage("en")).toBe("English");
    expect(feedbackLanguage("vi")).toBe("Vietnamese");
  });
});
