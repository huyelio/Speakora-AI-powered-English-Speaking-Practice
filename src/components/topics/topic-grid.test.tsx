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

  expect(markup).toContain("20 questions available");
  expect(markup).toContain("Practiced 2 times");
  expect(markup).toContain('href="/topics/travel"');
});

it("renders an actionable empty state", () => {
  const markup = renderToStaticMarkup(<TopicGrid topics={[]} />);
  expect(markup).toContain("No topics match these filters");
});
