import { describe, expect, it } from "vitest";
import { legacyHubRedirect, parseTopicSlug, vocabularyTopicHref } from "./hub-model";

describe("vocabulary hub model", () => {
  it("keeps a well-formed topic slug", () => {
    expect(parseTopicSlug("food-and-cooking")).toBe("food-and-cooking");
    expect(parseTopicSlug([" travel ", "work"])).toBe("travel");
    expect(parseTopicSlug("<script>")).toBeUndefined();
    expect(parseTopicSlug("")).toBeUndefined();
  });

  it("builds topic page URLs under a static segment", () => {
    expect(vocabularyTopicHref("travel")).toBe("/vocabulary/topics/travel");
  });

  it("sends old mode links to the topic page or the plain hub", () => {
    expect(legacyHubRedirect({})).toBeNull();
    expect(legacyHubRedirect({ mode: "review", topic: "travel" })).toBe("/vocabulary/topics/travel");
    expect(legacyHubRedirect({ topic: "travel" })).toBe("/vocabulary/topics/travel");
    expect(legacyHubRedirect({ mode: "pronounce" })).toBe("/vocabulary");
    expect(legacyHubRedirect({ mode: "learn", topic: "<bad>" })).toBe("/vocabulary");
  });
});
