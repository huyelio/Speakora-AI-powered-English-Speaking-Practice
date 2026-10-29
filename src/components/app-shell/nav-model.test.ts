import { describe, expect, it } from "vitest";
import { activeSection, navItems } from "./nav-model";

describe("activeSection", () => {
  it.each([
    ["/dashboard", "home"],
    ["/vocabulary", "vocabulary"],
    ["/vocabulary/3f1c", "vocabulary"],
    ["/vocabulary-learning/3f1c", "vocabulary"],
    ["/pronunciation/3f1c", "vocabulary"],
    ["/speaking", "speaking"],
    ["/explore", "speaking"],
    ["/topics/travel", "speaking"],
    ["/practice/3f1c", "speaking"],
    ["/conversation", "conversation"],
    ["/conversation/session", "conversation"],
    ["/ielts", "ielts"],
    ["/profile", "account"],
    ["/history/3f1c", "account"],
  ])("maps %s to %s", (pathname, section) => {
    expect(activeSection(pathname)).toBe(section);
  });

  it("does not match on a shared prefix that is not a path segment", () => {
    expect(activeSection("/vocabularyx")).toBeNull();
    expect(activeSection("/dashboards")).toBeNull();
  });

  it("returns null for routes outside the learner sections", () => {
    expect(activeSection("/onboarding")).toBeNull();
    expect(activeSection("/auth/sign-in")).toBeNull();
  });

  it("keeps the account item for the phone tab bar only", () => {
    expect(navItems.filter((item) => item.mobileOnly).map((item) => item.section)).toEqual(["account"]);
    expect(navItems.find((item) => item.section === "ielts")?.shortLabel).toBe("IELTS");
  });
});
