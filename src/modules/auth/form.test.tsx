import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AuthActionFeedback } from "./form";

it("renders an accessible server-action error", () => {
  const html = renderToStaticMarkup(
    <AuthActionFeedback result={{ error: "Không thể đăng nhập." }} />,
  );

  expect(html).toContain('role="alert"');
  expect(html).toContain("Không thể đăng nhập.");
});
