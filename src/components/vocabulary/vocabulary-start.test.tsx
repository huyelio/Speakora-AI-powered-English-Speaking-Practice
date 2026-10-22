import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { VocabularyStart } from "./vocabulary-start";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const topics = [
  {
    id: "topic-travel",
    slug: "travel",
    name: "Travel",
    levels: [{ level: "BEGINNER" as const, count: 12 }],
    totalCount: 12,
  },
  {
    id: "topic-home",
    slug: "home-and-neighborhood",
    name: "Home & Neighborhood",
    levels: [{ level: "INTERMEDIATE" as const, count: 8 }],
    totalCount: 8,
  },
];

it("renders vocabulary topics as illustrated radio cards with word metadata", () => {
  const markup = renderToStaticMarkup(<VocabularyStart topics={topics} preferredSlug="home-and-neighborhood" />);

  expect(markup).toContain('class="session-topic-grid vocab-topic-grid"');
  expect(markup).toContain('/images/topics/travel.webp');
  expect(markup).toContain('/images/topics/home-neighborhood.webp');
  expect(markup).toContain("12 từ");
  expect(markup).toContain("8 từ");
  expect(markup).toMatch(/<input(?=[^>]*name="vocab-topic")(?=[^>]*checked="")(?=[^>]*value="topic-home")[^>]*>/);
  expect(markup).not.toContain("<select");
});

it("renders the shared fallback thumbnail for an unknown topic", () => {
  const markup = renderToStaticMarkup(<VocabularyStart topics={[{
    id: "topic-custom",
    slug: "custom-topic",
    name: "Custom Topic",
    levels: [{ level: "BEGINNER", count: 4 }],
    totalCount: 4,
  }]} />);

  expect(markup).toContain("session-topic-thumbnail is-fallback");
});
