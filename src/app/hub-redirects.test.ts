import { describe, expect, it } from "vitest";
import { hubRedirects } from "../../next.config.mjs";

describe("hub redirects", () => {
  it("only match exact entry paths so session URLs keep resolving", () => {
    for (const redirect of hubRedirects) {
      expect(redirect.source).toMatch(/^\/[a-z-]+(\/[a-z-]+)*$/);
      expect(redirect.source).not.toContain(":");
      expect(redirect.source).not.toContain("*");
    }
  });

  it("send old entry pages to the matching hub", () => {
    expect(Object.fromEntries(hubRedirects.map((redirect) => [redirect.source, redirect.destination]))).toMatchObject({
      "/vocabulary-learning": "/vocabulary",
      "/pronunciation": "/vocabulary",
      "/explore": "/speaking?tab=topics",
    });
  });

  it("never redirects a route that still renders sessions", () => {
    const sessionRoots = ["/vocabulary", "/practice", "/topics", "/history", "/speaking/conversation"];
    expect(hubRedirects.map((redirect) => redirect.source)).not.toEqual(expect.arrayContaining(sessionRoots));
  });
});
