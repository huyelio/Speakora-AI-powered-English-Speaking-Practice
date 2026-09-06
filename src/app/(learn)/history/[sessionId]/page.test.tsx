import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  authorizeSession: vi.fn(),
  getAnswerReview: vi.fn(),
  getAssessment: vi.fn(),
  getSessionStatus: vi.fn(),
  getGeneralResultExperience: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("not found"); }),
  redirect: vi.fn(() => { throw new Error("redirect"); }),
}));
vi.mock("../../../../lib/supabase/auth-server", () => ({ getRequestUser: dependencies.getRequestUser }));
vi.mock("../../../../modules/practice/repository", () => dependencies);
vi.mock("../../../../components/practice/result-view", () => ({
  ResultView: ({ experience }: { experience?: { rewards: { totalXp: number } } }) => experience ? `XP ${experience.rewards.totalXp}` : "missing experience",
}));

import HistoryDetailPage from "./page";

it("reuses the authorized General result experience when reopening history", async () => {
  dependencies.getRequestUser.mockResolvedValue({ id: "learner-1" });
  dependencies.authorizeSession.mockResolvedValue({ id: "session-1", mode: "GENERAL", userId: "learner-1" });
  dependencies.getAssessment.mockResolvedValue({ mode: "GENERAL", overallFeedback: "Clear" });
  dependencies.getAnswerReview.mockResolvedValue([]);
  dependencies.getGeneralResultExperience.mockResolvedValue({ rewards: { totalXp: 345 } });

  const element = await HistoryDetailPage({ params: Promise.resolve({ sessionId: "session-1" }) });
  const markup = renderToStaticMarkup(element);

  expect(dependencies.getGeneralResultExperience).toHaveBeenCalled();
  expect(markup).toContain("XP 345");
});
