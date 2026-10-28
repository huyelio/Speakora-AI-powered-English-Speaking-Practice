import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PracticeSession } from "./practice-session";
import type { ClientPracticeSession } from "../../modules/practice/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/practice/session-1", useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../modules/auth/actions", () => ({ signIn: vi.fn() }));

const session: ClientPracticeSession = {
  sessionId: "session-1", mode: "IELTS", status: "IN_PROGRESS", currentQuestionIndex: 0, topic: null,
  questions: [{ sessionQuestionId: "sq-1", sequenceNo: 1, id: "q-1", code: "Q1", promptText: "Describe a skill you learned.", instructionText: "You should say:", prepSeconds: 60, answerSeconds: 120, questionType: "IELTS_PART_2_CUE_CARD", topic: null, promptItems: [{ sequenceNo: 1, content: "How you learned it" }] }],
};

it("keeps dynamic Part 2 content and explicit recording controls in the examiner layout", () => {
  const html = renderToStaticMarkup(<PracticeSession initialSession={session} principalKind="user" />);
  expect(html).toContain("Describe a skill you learned.");
  expect(html).toContain("You should say:");
  expect(html).toContain("How you learned it");
  expect(html).toContain("AI Examiner");
  expect(html).toContain('aria-label="Bắt đầu ghi âm"');
  expect(html).not.toContain("Gửi câu trả lời</button>");
  expect(html).toContain('aria-valuenow="0"');
});

it("keeps the General English companion and omits IELTS examiner presentation", () => {
  const html = renderToStaticMarkup(<PracticeSession initialSession={{ ...session, mode: "GENERAL" }} principalKind="user" />);
  expect(html).not.toContain("AI Examiner");
  expect(html).not.toContain("ielts-sidebar");
  expect(html).toContain("Từng bước");
});

it("lays the session out as a fixed frame with the record control in the action bar", () => {
  const html = renderToStaticMarkup(<PracticeSession initialSession={{ ...session, mode: "GENERAL", topic: { slug: "family-friends", name: "Family & Friends" } }} principalKind="user" />);
  expect(html).toContain("a5-session-top");
  expect(html).toContain("a5-session-body");
  // The mic lives in the always-visible action bar, after the scrolling body.
  expect(html.indexOf('aria-label="Bắt đầu ghi âm"')).toBeGreaterThan(html.indexOf("a5-session-actions"));
  expect(html).toContain("Từ nên dùng");
  expect(html).not.toContain("LUYỆN NÓI TIẾNG ANH");
});
