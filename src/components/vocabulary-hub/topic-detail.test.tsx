import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TopicProgress } from "../../modules/vocabulary-learning/topic-progress";
import { TopicBoard } from "./topic-board";
import { TopicDetail } from "./topic-detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../practice/reauthenticate-dialog", () => ({ ReauthenticateDialog: () => null }));

const topic: TopicProgress = {
  id: "t1", slug: "travel", name: "Travel", level: "BEGINNER",
  counts: { NEW: 6, LEARNING: 1, WEAK: 2, MASTERED: 1, total: 10 },
  words: [{ id: "w1", word: "luggage", ipa: "/ˈlʌɡ.ɪdʒ/", meaningVi: "hành lý", state: "WEAK" }],
  action: { kind: "learn", count: 6, review: 3, fresh: 3 },
};

describe("topic page", () => {
  it("offers one primary step with its mix, and no level or count form", () => {
    const html = renderToStaticMarkup(<TopicDetail topic={topic} />);
    expect(html).toContain("Học 6 từ tiếp theo");
    expect(html).toContain("Gồm 3 từ cần ôn và 3 từ mới.");
    expect(html).toContain("Lật thẻ nhanh");
    expect(html).toContain("Chỉ luyện phát âm");
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain('type="radio"');
    expect(html).toContain('data-state="WEAK"');
  });

  it("resumes an unfinished session by link instead of creating another", () => {
    const html = renderToStaticMarkup(<TopicDetail topic={{ ...topic, action: { kind: "resume", sessionId: "s1" } }} />);
    expect(html).toContain('href="/vocabulary-learning/s1"');
    expect(html).toContain("Tiếp tục phiên đang học");
  });

  it("switches to mastered review once every word is mastered", () => {
    const html = renderToStaticMarkup(<TopicDetail topic={{ ...topic, action: { kind: "review-mastered", count: 6 } }} />);
    expect(html).toContain("Ôn lại cả chủ đề");
  });
});

describe("topic board", () => {
  it("links every card to its topic page and hides the filter for a single level", () => {
    const { words, ...card } = topic; void words;
    const html = renderToStaticMarkup(<TopicBoard topics={[card]} />);
    expect(html).toContain('href="/vocabulary/topics/travel"');
    expect(html).toContain("2 từ cần ôn");
    expect(html).not.toContain("Lọc theo trình độ");
  });

  it("shows level filters when topics span levels", () => {
    const { words, ...card } = topic; void words;
    const html = renderToStaticMarkup(<TopicBoard topics={[card, { ...card, id: "t2", slug: "work", level: "INTERMEDIATE" }]} />);
    expect(html).toContain("Lọc theo trình độ");
    expect(html).toContain("Trung cấp");
  });
});
