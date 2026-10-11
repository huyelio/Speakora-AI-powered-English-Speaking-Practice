import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { query, getAssessment, getSupabaseAdminClient } = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "or", "order", "limit"]) query[method] = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  return { query, getAssessment: vi.fn(), getSupabaseAdminClient: vi.fn(() => ({ from: vi.fn(() => query) })) };
});
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../practice/repository", () => ({ getAssessment }));
import { getLatestSkillReview } from "./skill-review";

beforeEach(() => { vi.clearAllMocks(); });

it("loads only the owner's latest completed General result", async () => {
  query.maybeSingle.mockResolvedValue({ data: { id: "session-1", completed_at: "2026-10-03T01:00:00Z" }, error: null });
  const result = {
    mode: "GENERAL", overallFeedback: "Keep practicing", strengths: [], improvements: [], nextSteps: [],
    criteria: null, usefulPhrase: "I enjoy learning", recommendationTags: [],
    pronunciation: { available: false, summary: "Unavailable", practiceWords: [], status: "UNAVAILABLE", analyzedAnswerCount: 0, totalAnswerCount: 5, wordDetails: [] },
  };
  getAssessment.mockResolvedValue(result);
  expect(await getLatestSkillReview("learner-1")).toEqual({ sessionId: "session-1", completedAt: "2026-10-03T01:00:00Z", result });
  expect(query.eq.mock.calls).toEqual([["user_id", "learner-1"], ["mode", "GENERAL"], ["status", "COMPLETED"]]);
  expect(query.order).toHaveBeenCalledWith("completed_at", { ascending: false });
  expect(query.limit).toHaveBeenCalledWith(1);
  expect(query.or).toHaveBeenCalledWith("session_kind.is.null,session_kind.neq.QUICK_CHECK");
});

it("returns an empty state for a learner with no completed General session", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await getLatestSkillReview("new-learner")).toBeNull();
  expect(getAssessment).not.toHaveBeenCalled();
});

it("does not pretend a failed read is an empty learning history", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: "database offline" } });
  await expect(getLatestSkillReview("learner-1")).rejects.toThrow("Unable to load skill review.");
});
