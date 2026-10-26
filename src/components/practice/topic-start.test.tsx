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

it("preselects the level filtered in the speaking hub when the topic offers it", () => {
  const html = renderToStaticMarkup(
    <TopicStart
      initialLevel="INTERMEDIATE"
      levels={[
        { level: "BEGINNER", count: 5 },
        { level: "INTERMEDIATE", count: 7 },
      ]}
      topicId="11111111-1111-4111-8111-111111111111"
    />,
  );

  const selected = html.split("<label").filter((label) => label.startsWith(' class="selected"'));
  expect(selected).toHaveLength(1);
  expect(selected[0]).toContain('value="INTERMEDIATE"');
});

it("skips the level step when the topic has a single level", () => {
  const html = renderToStaticMarkup(
    <TopicStart levels={[{ level: "BEGINNER", count: 6 }]} topicId="11111111-1111-4111-8111-111111111111" />,
  );

  expect(html).not.toContain("<fieldset");
  expect(html).toContain("Trình độ Cơ bản · 6 câu có sẵn");
  expect(html).toContain("Bắt đầu 5 câu luyện nói");
});
