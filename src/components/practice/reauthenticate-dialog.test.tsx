import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/practice/session-1",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../../modules/auth/actions", () => ({ signIn: vi.fn() }));

import { ReauthenticateDialog } from "./reauthenticate-dialog";

it("uses the browser's keyboard-modal dialog primitive and binds the pending session", () => {
  const html = renderToStaticMarkup(
    <ReauthenticateDialog
      onAuthenticated={() => undefined}
      onCancel={() => undefined}
      open
      sessionId="session-1"
    />,
  );

  expect(html).toContain("<dialog");
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('name="pendingSessionId"');
  expect(html).toContain('value="session-1"');
});
