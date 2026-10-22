import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { query, getAssessment, getSupabaseAdminClient } = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "or", "order", "limit"]) query[method] = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  return {
    query,
    getAssessment: vi.fn(),
    getSupabaseAdminClient: vi.fn(() => ({ from: vi.fn(() => query) })),
  };
});

vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../practice/repository", () => ({ getAssessment }));

import { getEnglishSkills } from "./english-skills";

beforeEach(() => {
  vi.clearAllMocks();
});

it("shows the persisted CEFR from the learner's latest Quick Speaking Check only for Speaking", async () => {
  query.maybeSingle.mockResolvedValue({
    data: { id: "quick-1", mode: "GENERAL", session_kind: "QUICK_CHECK", completed_at: "2026-10-20T03:00:00Z" },
    error: null,
  });
  getAssessment.mockResolvedValue({
    mode: "GENERAL",
    overallFeedback: "Clear ideas.",
    strengths: [],
    improvements: [],
    nextSteps: [],
    criteria: null,
    usefulPhrase: "",
    recommendationTags: [],
    pronunciation: { available: false, summary: "", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 3, wordDetails: [] },
    quickCheck: { estimatedCefr: "B1", feedback: "Clear ideas.", recommendation: "Expand your answers." },
  });

  const skills = await getEnglishSkills("learner-1");

  expect(skills.find((skill) => skill.key === "speaking")).toEqual({
    key: "speaking",
    label: "Speaking",
    status: "ASSESSED",
    value: "B1",
    scale: "CEFR",
    source: "Quick Speaking Check",
    assessedAt: "2026-10-20T03:00:00Z",
    sessionId: "quick-1",
  });
  expect(skills.filter((skill) => skill.key !== "speaking")).toEqual([
    { key: "listening", label: "Listening", status: "NOT_ASSESSED" },
    { key: "reading", label: "Reading", status: "NOT_ASSESSED" },
    { key: "writing", label: "Writing", status: "NOT_ASSESSED" },
  ]);
  expect(query.eq.mock.calls).toEqual([["user_id", "learner-1"], ["status", "COMPLETED"]]);
  expect(query.or).toHaveBeenCalledWith("mode.eq.IELTS,session_kind.eq.QUICK_CHECK");
  expect(query.order.mock.calls).toEqual([
    ["completed_at", { ascending: false }],
    ["id", { ascending: false }],
  ]);
  expect(query.limit).toHaveBeenCalledWith(1);
  expect(getAssessment).toHaveBeenCalledWith("quick-1", "GENERAL", "QUICK_CHECK");
});

it("shows the persisted band from the learner's latest IELTS Speaking assessment", async () => {
  query.maybeSingle.mockResolvedValue({
    data: { id: "ielts-1", mode: "IELTS", session_kind: null, completed_at: "2026-10-21T03:00:00Z" },
    error: null,
  });
  getAssessment.mockResolvedValue({
    mode: "IELTS",
    estimatedBand: 6.5,
    overallFeedback: "Good response.",
    strengths: [],
    improvements: [],
    nextSteps: [],
    criteria: null,
  });

  const skills = await getEnglishSkills("learner-1");

  expect(skills.find((skill) => skill.key === "speaking")).toEqual({
    key: "speaking",
    label: "Speaking",
    status: "ASSESSED",
    value: "6.5",
    scale: "IELTS band estimate",
    source: "IELTS Speaking",
    assessedAt: "2026-10-21T03:00:00Z",
    sessionId: "ielts-1",
  });
  expect(getAssessment).toHaveBeenCalledWith("ielts-1", "IELTS", undefined);
});

it("returns four unassessed skills when the learner has no persisted skill assessment", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });

  expect(await getEnglishSkills("new-learner")).toEqual([
    { key: "listening", label: "Listening", status: "NOT_ASSESSED" },
    { key: "speaking", label: "Speaking", status: "NOT_ASSESSED" },
    { key: "reading", label: "Reading", status: "NOT_ASSESSED" },
    { key: "writing", label: "Writing", status: "NOT_ASSESSED" },
  ]);
  expect(getAssessment).not.toHaveBeenCalled();
});

it("does not disguise a database failure as an unassessed learner", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: "database offline" } });

  await expect(getEnglishSkills("learner-1")).rejects.toThrow("Unable to load English skills.");
});
