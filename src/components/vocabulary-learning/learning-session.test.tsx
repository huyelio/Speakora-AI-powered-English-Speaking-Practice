import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LearningSession } from "../../modules/vocabulary-learning/types";
import { EMPTY_EVIDENCE } from "../../modules/vocabulary-learning/rules";
import { LearningSessionView } from "./learning-session";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../practice/reauthenticate-dialog", () => ({ ReauthenticateDialog: () => null }));
vi.mock("../pronunciation/pronunciation-card", () => ({ PronunciationCard: (props: { nextLabel: string; feedbackMode: string }) => <section data-mode={props.feedbackMode}>{props.nextLabel}</section> }));
const session: LearningSession = {
  sessionId: "learning-1", topic: { id: "topic", slug: "daily", name: "Daily" }, level: "BEGINNER", stage: "LEARN", cursor: 0, contextItemIds: [],
  items: [{ sessionItemId: "item", vocabularyItemId: "word", sequenceNo: 1, review: "REMEMBERED", contextResult: null, evidence: { ...EMPTY_EVIDENCE, latestReview: "REMEMBERED", recalls: [true], pronunciation: "GOOD" }, snapshot: { word: "apple", meaning_vi: "quả táo", definition_en: "a fruit", example_sentence: "An apple.", pronunciation_ipa: "/apple/", level: "BEGINNER", first_letter_hint: "a____", context_prompt: "An _____.", initial_evidence: EMPTY_EVIDENCE } }],
  pronunciation: { sessionId: "pron-1", sourceSessionId: null, topic: { id: "topic", slug: "daily", name: "Daily" }, level: "BEGINNER", itemCount: 1, status: "IN_PROGRESS", summary: { averageScore: null, completedCount: 0, goodCount: 0, practiceCount: 0, weakCount: 0, weakWords: [] }, items: [{ sessionItemId: "pron-item", vocabularyItemId: "word", sequenceNo: 1, snapshot: { word: "apple", meaningVi: "quả táo", pronunciationIpa: "/apple/", level: "BEGINNER" }, latestSuccessfulAttempt: null }] },
};
describe("V2 learning screens", () => {
  it("shows the meaning and example during Learn", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={session} />);
    expect(html).toContain("An apple."); expect(html).toContain("quả táo"); expect(html).toContain("Nghe phát âm mẫu");
  });
  it("embeds the opted-in pronunciation card and offers Recall on the final item", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "PRONOUNCE" }} />);
    expect(html).toContain('data-mode="learning-v2"'); expect(html).toContain("Tiếp tục nhớ từ"); expect(html).not.toContain("Bạn đã hoàn thành phiên học");
  });
  it("offers a skip only for a word that has no pronunciation result yet", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "PRONOUNCE" }} />);
    expect(html).toContain("Bỏ qua từ này");
    const done = { ...session.pronunciation.items[0], latestSuccessfulAttempt: { attemptId: "a" } } as unknown as typeof session.pronunciation.items[0];
    const withResult = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "PRONOUNCE", pronunciation: { ...session.pronunciation, items: [done] } }} />);
    expect(withResult).not.toContain("Bỏ qua từ này");
  });
  it("does not reveal the word or example during Recall", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "RECALL" }} />);
    expect(html).toContain("quả táo"); expect(html).not.toContain("apple"); expect(html).toContain('for="learning-answer"');
  });
  it("shows frozen context prompts without exposing the answer", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "CONTEXT", contextItemIds: ["item"] }} />);
    expect(html).toContain("An _____."); expect(html).not.toContain("apple");
  });
  it("compares initial evidence and explains skipped context", () => {
    const html = renderToStaticMarkup(<LearningSessionView initial={{ ...session, stage: "SUMMARY" }} />);
    expect(html).toContain("Mới → Đang học"); expect(html).toContain("Đã tiến bộ"); expect(html).toContain("Đã bỏ qua ngữ cảnh"); expect(html).not.toContain("Luyện lại từ còn yếu");
  });
});
