import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TopicGrid } from "./topic-grid";

it("shows the available question count and learner practice state", () => {
  const markup = renderToStaticMarkup(<TopicGrid topics={[{
    id: "topic-1",
    slug: "travel",
    name: "Travel",
    levels: [{ level: "BEGINNER", count: 12 }, { level: "INTERMEDIATE", count: 8 }],
    practicedCount: 2,
    lastPracticedAt: "2026-08-20T00:00:00.000Z",
  }]} />);

  expect(markup).toContain("20 câu hỏi");
  expect(markup).toContain("Đã luyện 2 lần");
  expect(markup).toContain('href="/topics/travel"');
  expect(markup).toContain('/images/topics/travel.webp');
  expect(markup).toContain('class="session-topic-thumbnail"');
});

it("uses the shared fallback thumbnail for an unknown speaking topic", () => {
  const markup = renderToStaticMarkup(<TopicGrid topics={[{
    id: "topic-custom",
    slug: "custom-topic",
    name: "Custom Topic",
    levels: [{ level: "BEGINNER", count: 5 }],
    practicedCount: 0,
    lastPracticedAt: null,
  }]} />);

  expect(markup).toContain("session-topic-thumbnail is-fallback");
});

it("renders an actionable empty state", () => {
  const markup = renderToStaticMarkup(<TopicGrid topics={[]} />);
  expect(markup).toContain("Không tìm thấy chủ đề phù hợp");
});
