import { describe, expect, it } from "vitest";
import { getTopicIllustration } from "./topic-illustration";

describe("getTopicIllustration", () => {
  it.each([
    ["shopping", "Shopping", "/images/topics/shopping.webp"],
    ["study", "Study", "/images/topics/study.webp"],
    ["social-situations", "Social Situations", "/images/topics/social-situations.webp"],
    ["transportation", "Transportation", "/images/topics/transportation.webp"],
  ])("maps %s to its local illustration", (slug, name, expected) => {
    expect(getTopicIllustration(slug, name)).toBe(expected);
  });
});
