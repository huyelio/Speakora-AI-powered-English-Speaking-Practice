import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { from, select, eq, order, maybeSingle } = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient: () => ({ from }) }));
import { getAssessment } from "./repository";

const criterion = { summary: "Clear ideas", example: null };
const raw = {
  overall_feedback: "Keep practicing", strengths: ["Clear ideas"], improvements: ["Link ideas"], next_steps: ["Practice linking"],
  criteria: { fluency_coherence: criterion, lexical_resource: criterion, grammatical_range_accuracy: criterion },
  useful_phrase: "One thing I enjoy is learning", recommendation_tags: ["TRAVEL"],
};
const analysis = { schemaVersion: 1, languageCode: "en", overall: { accuracy: 90 }, words: [] };

beforeEach(() => {
  vi.clearAllMocks();
  const query = { select, eq, order, maybeSingle };
  from.mockReturnValue(query);
  select.mockReturnValue(query);
  eq.mockReturnValue(query);
  maybeSingle.mockResolvedValue({ data: {
    assessment_mode: "GENERAL", estimated_band: null, ...raw, raw_output: raw,
  }, error: null });
});

it("reads only the compact assessment for Quick Check without a pronunciation query", async () => {
  maybeSingle.mockResolvedValue({ data: {
    assessment_mode: "GENERAL", estimated_band: null, overall_feedback: "Clear ideas.", strengths: [], improvements: [], next_steps: [],
    raw_output: { estimated_cefr: "A2", feedback: "Clear ideas.", recommendation: "Practice." },
  }, error: null });
  expect(await getAssessment("check-1", "GENERAL", "QUICK_CHECK")).toMatchObject({ quickCheck: { estimatedCefr: "A2" } });
  expect(from.mock.calls).toEqual([["session_assessments"]]);
});

it("keeps all session questions in pronunciation coverage with one metadata query", async () => {
  order.mockResolvedValue({ data: [
    { sequence_no: 1, user_answers: [{ transcripts: [{ provider_metadata: { pronunciation: { provider: "lingolix", result: analysis } } }] }] },
    { sequence_no: 2, user_answers: [{ transcripts: [] }] },
    { sequence_no: 3, user_answers: [] },
  ], error: null });
  const result = await getAssessment("owned-session", "GENERAL");
  expect(result?.mode === "GENERAL" && result.pronunciation).toMatchObject({ available: true, analyzedAnswerCount: 1, totalAnswerCount: 3 });
  expect(select.mock.calls[1][0]).toBe("sequence_no,user_answers(transcripts(provider_metadata))");
  expect(from.mock.calls).toEqual([["session_assessments"], ["session_questions"]]);
  expect(eq.mock.calls).toEqual([["session_id", "owned-session"], ["session_id", "owned-session"]]);
});

it("counts each answer once even if nested rows repeat its metadata", async () => {
  const metadata = { pronunciation: { provider: "lingolix", result: analysis } };
  order.mockResolvedValue({ data: [{ sequence_no: 1, user_answers: [{ transcripts: [
    { provider_metadata: metadata }, { provider_metadata: metadata },
  ] }] }], error: null });
  const result = await getAssessment("owned-session", "GENERAL");
  expect(result?.mode === "GENERAL" && result.pronunciation).toMatchObject({ analyzedAnswerCount: 1, totalAnswerCount: 1 });
});

it("fails soft on metadata read errors without preventing the assessment result", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    order.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    const result = await getAssessment("owned-session", "GENERAL");
    expect(result).toMatchObject({ mode: "GENERAL", overallFeedback: "Keep practicing", pronunciation: {
      status: "UNAVAILABLE", available: false, analyzedAnswerCount: 0, wordDetails: [],
    } });
  } finally { warning.mockRestore(); }
});

it("does not read Lingolix metadata for IELTS", async () => {
  const ieltsRaw = { ...raw, estimated_band: 6.5 };
  delete (ieltsRaw as Partial<typeof raw>).useful_phrase;
  delete (ieltsRaw as Partial<typeof raw>).recommendation_tags;
  maybeSingle.mockResolvedValue({ data: { assessment_mode: "IELTS", estimated_band: 6.5, ...raw, raw_output: ieltsRaw }, error: null });
  const result = await getAssessment("owned-session", "IELTS");
  expect(result).toMatchObject({ mode: "IELTS", estimatedBand: 6.5 });
  expect(result).not.toHaveProperty("pronunciation");
  expect(from.mock.calls).toEqual([["session_assessments"]]);
});
