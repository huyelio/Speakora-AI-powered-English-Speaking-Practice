import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  authorizeSession: vi.fn(),
  questionBelongsToSession: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("../conversation/repository", () => ({ conversationStore: { load: mocks.load } }));
vi.mock("../practice/repository", () => ({ authorizeSession: mocks.authorizeSession, questionBelongsToSession: mocks.questionBelongsToSession }));
vi.mock("../../lib/supabase/server", () => {
  const query = { select: () => query, eq: () => query, maybeSingle: mocks.maybeSingle };
  return { getSupabaseAdminClient: () => ({ from: () => query }) };
});

import { airplaneScenario } from "../conversation/scenario";
import { resolveSpeech } from "./sources";

const user = { kind: "user", userId: "user-1" } as const;
const guest = { kind: "guest", token: "raw-guest-token" } as const;
const sessionId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

describe("resolveSpeech", () => {
  beforeEach(() => vi.clearAllMocks());

  it("caches an owned vocabulary word read from its snapshot", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { snapshot: { word: " Ambition " } }, error: null });
    expect(await resolveSpeech("vocabulary", user, sessionId, itemId)).toMatchObject({ text: "Ambition.", cacheable: true });
  });

  it("refuses words to guests and to non-owners", async () => {
    expect(await resolveSpeech("pronunciation", guest, sessionId, itemId)).toBeNull();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await resolveSpeech("pronunciation", user, sessionId, itemId)).toBeNull();
  });

  it("lets an authorized guest hear an IELTS prompt, cached", async () => {
    mocks.authorizeSession.mockResolvedValue({ id: sessionId });
    mocks.questionBelongsToSession.mockResolvedValue({ prompt_snapshot: { prompt_text: "Describe your hometown." } });
    expect(await resolveSpeech("question", guest, sessionId, itemId)).toMatchObject({ text: "Describe your hometown.", cacheable: true });
    mocks.authorizeSession.mockResolvedValue(null);
    expect(await resolveSpeech("question", guest, sessionId, itemId)).toBeNull();
  });

  it("shares only the scenario's fixed opening; AI replies stay private", async () => {
    const session = (content: string) => ({ scenario: airplaneScenario, messages: [{ id: itemId, role: "assistant", content }] });
    mocks.load.mockResolvedValue(session(airplaneScenario.opening));
    expect(await resolveSpeech("conversation", user, sessionId, itemId)).toMatchObject({ cacheable: true });
    mocks.load.mockResolvedValue(session("Nice to meet you, Lan! Where are you flying today?"));
    expect(await resolveSpeech("conversation", user, sessionId, itemId)).toMatchObject({ cacheable: false });
  });

  it("never speaks a learner's own message", async () => {
    mocks.load.mockResolvedValue({ scenario: airplaneScenario, messages: [{ id: itemId, role: "user", content: "private learner text" }] });
    expect(await resolveSpeech("conversation", user, sessionId, itemId)).toBeNull();
  });
});
