import { beforeEach, expect, it, vi } from "vitest";
import { airplaneScenario, conversationScenarios } from "./scenario";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient: () => mocks }));
import { createConversation, conversationStore } from "./repository";

beforeEach(() => { vi.resetAllMocks(); });

function savedSession(snapshot: unknown) {
  const value = snapshot as { key: string };
  const session = { id: "session", status: "IN_PROGRESS", user_turn_count: 0, completed_goals: [], pending_message_id: null, processing_until: null, scenario_key: value.key, scenario_snapshot: snapshot };
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: session, error: null })), order: vi.fn(async () => ({ data: [], error: null })) };
  mocks.from.mockReturnValue(query);
  return query;
}

it("creates from the server catalog but returns the immutable snapshot when an ID already exists", async () => {
  const cafe = conversationScenarios[1];
  const saved = { ...cafe, title: "Previously saved café", opening: "Original opening" };
  const query = savedSession(saved);
  mocks.rpc.mockResolvedValue({ error: null });
  const session = await createConversation("owner", "session", airplaneScenario.key);
  expect(mocks.rpc).toHaveBeenCalledWith("create_conversation_session", { p_id: "session", p_user_id: "owner", p_snapshot: airplaneScenario });
  expect(session.scenario).toEqual(saved);
  expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
});

it("rejects an unknown scenario before creating data", async () => {
  await expect(createConversation("owner", "session", "invented")).rejects.toThrow("Không tìm thấy");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("loads old airplane snapshots without replacing their saved content", async () => {
  const { context, category, difficulty, instructions, ...old } = airplaneScenario;
  void context; void category; void difficulty; void instructions;
  savedSession({ ...old, title: "Old airplane", goals: old.goals.map(({ id, label, hint }) => ({ id, label, hint })) });
  const session = await conversationStore.load("owner", "session");
  expect(session.scenario.title).toBe("Old airplane");
  expect(session.scenario.goals[0].criterion).toBeTruthy();
});
