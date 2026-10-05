import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PronunciationPreview } from "./pronunciation-preview";

it("labels the preview as an example, not learner feedback, and requires explicit playback", () => {
  const html = renderToStaticMarkup(<PronunciationPreview />);
  expect(html).toContain("banana");
  expect(html).toContain("/bəˈnɑːnə/");
  expect(html).toContain("Minh họa cách luyện");
  expect(html).toContain("Trọng âm ở âm tiết thứ hai");
  expect(html).toMatch(/<button[^>]*type="button"[^>]*aria-label="Nghe mẫu từ banana"/);
  expect(html).not.toContain("<audio");
  expect(html).not.toContain("autoplay");
  expect(html).not.toContain("accuracy");
});
