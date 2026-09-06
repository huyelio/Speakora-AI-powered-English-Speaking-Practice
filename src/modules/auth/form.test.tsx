import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AuthActionFeedback } from "./form";

it("renders an accessible server-action error", () => {
  const html = renderToStaticMarkup(
    <AuthActionFeedback result={{ status: "error", error: "Không thể đăng nhập." }} />,
  );

  expect(html).toContain('role="alert"');
  expect(html).toContain("Không thể đăng nhập.");
});

it("renders a confirmation-required result as an accessible status", () => {
  const html = renderToStaticMarkup(
    <AuthActionFeedback
      result={{ status: "confirmation-required", email: "learner@example.com" }}
    />,
  );

  expect(html).toContain('role="status"');
  expect(html).toContain("learner@example.com");
  expect(html).toContain("Kiểm tra email");
});
