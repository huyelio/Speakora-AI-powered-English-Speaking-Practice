import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ConversationSessionView } from "./conversation-session";

describe("role-play introduction", () => {
  it("enters a situation with a start action, without exercise configuration fields", () => {
    const html = renderToStaticMarkup(<ConversationSessionView initialSessionId={null} />);
    expect(html).toContain("An airplane chat");
    expect(html).toContain("Bắt đầu hội thoại");
    expect(html).toContain("Speakora AI");
    expect(html).toContain("0/2");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
});
