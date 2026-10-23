import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AmbientBackground } from "./ambient-background";

it("keeps background decoration out of the accessibility and keyboard navigation trees", () => {
  const html = renderToStaticMarkup(<AmbientBackground />);
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toMatch(/<(button|a|input)\b/);
  expect(html).not.toContain("tabindex");
});
