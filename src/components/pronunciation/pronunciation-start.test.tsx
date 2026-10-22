import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PronunciationStart } from "./pronunciation-start";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/pronunciation" }));
vi.mock("../../modules/auth/actions", () => ({ signIn: vi.fn() }));

const topics = [
  { id: "travel", slug: "travel", name: "Travel", levels: [{ level: "BEGINNER" as const, count: 20 }], totalCount: 20 },
  { id: "work", slug: "work", name: "Work", levels: [{ level: "INTERMEDIATE" as const, count: 8 }], totalCount: 8 },
  { id: "home", slug: "home", name: "Home & Neighborhood", levels: [{ level: "BEGINNER" as const, count: 12 }], totalCount: 12 },
];

it("renders topic cards with thumbnail slots, wrapping titles and word-count metadata", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={topics} />);
  expect(html).toContain('class="pron-topic-thumbnail session-topic-thumbnail"');
  expect(html).toContain('<strong>Home &amp; Neighborhood</strong>');
  expect(html).toContain("<small>12 từ</small>");
});

it("maps local topic illustrations by slug or name and falls back for unknown topics", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={topics} />);
  expect(html).toContain('/images/topics/travel.webp');
  expect(html).toContain('/images/topics/home-neighborhood.webp');

  const unknown = [{ id: "other", slug: "other", name: "Other", levels: [{ level: "BEGINNER" as const, count: 4 }], totalCount: 4 }];
  const fallbackHtml = renderToStaticMarkup(<PronunciationStart topics={unknown} />);
  expect(fallbackHtml).toContain('class="pron-topic-thumbnail session-topic-thumbnail is-fallback"');
  expect(fallbackHtml).not.toContain("<img");
});

it("renders topic and level radios with the requested topic selected", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={topics} preferredSlug="work" />);
  expect(html).toMatch(/<input(?=[^>]*type="radio")(?=[^>]*name="pron-topic")(?=[^>]*value="work")(?=[^>]*checked="")[^>]*>/);
  expect(html).toMatch(/<input(?=[^>]*type="radio")(?=[^>]*name="pron-level")(?=[^>]*value="INTERMEDIATE")(?=[^>]*checked="")[^>]*>/);
  expect(html).not.toContain("<select");
  expect(html).toContain("Có 8 từ sẵn sàng");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"/);
});

it("renders the default count, custom count limits and an enabled submit button", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={topics} />);
  expect(html).toContain("10 từ · khoảng 5–7 phút");
  expect(html).toContain("Nghe → Thu âm → Nhận phản hồi");
  expect(html).toMatch(/aria-pressed="true"[^>]*>10/);
  expect(html).toMatch(/min="1"[^>]*max="20"[^>]*step="1"[^>]*required=""[^>]*type="number"[^>]*value="10"/);
  expect(html).toContain("Bắt đầu luyện phát âm");
  expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*type="submit"/);
});

it("disables oversized presets without removing smaller custom counts", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={topics} preferredSlug="work" />);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-pressed="true"[^>]*>10/);
  expect(html).toMatch(/max="8"/);
  expect(html).toContain("Hãy chọn số từ nhỏ hơn");
});

it("keeps empty-topic feedback instead of presenting unusable setup controls", () => {
  const html = renderToStaticMarkup(<PronunciationStart topics={[]} />);
  expect(html).toContain("Chưa có từ để luyện");
  expect(html).not.toContain("<form");
  expect(html).not.toContain("<select");
});
