import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { TopicStart } from "./topic-start";

it("offers only server-advertised levels and their question counts", () => {
  const html = renderToStaticMarkup(
    <TopicStart
      levels={[
        { level: "BEGINNER", count: 5 },
        { level: "INTERMEDIATE", count: 7 },
      ]}
      topicId="11111111-1111-4111-8111-111111111111"
    />,
  );

  expect(html).toContain("Cơ bản");
  expect(html).toContain("Trung cấp");
  expect(html).toContain("5 câu có sẵn");
  expect(html).toContain("7 câu có sẵn");
  expect(html).not.toContain("Nâng cao");
  expect(html).toContain("Bắt đầu 5 câu luyện nói");
});
