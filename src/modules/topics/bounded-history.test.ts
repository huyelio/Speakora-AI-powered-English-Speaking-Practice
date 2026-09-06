import { beforeEach, expect, it, vi } from "vitest";

const { getSupabaseAdminClient, from, rpc } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));

import { getAvailableTopics } from "./repository";

function resolvedQuery(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "not", "order", "limit", "in"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  query.then = (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  getSupabaseAdminClient.mockReturnValue({ from, rpc });
  from.mockImplementation((table: string) => table === "practice_modes"
    ? resolvedQuery({ data: { id: "mode-general" }, error: null })
    : resolvedQuery({ data: [], error: null }));
  rpc.mockResolvedValue({ data: [], error: null });
});

it("loads learner topic history through a bounded aggregate RPC", async () => {
  await getAvailableTopics("learner-1");

  expect(rpc).toHaveBeenCalledWith("get_learner_topic_history", { p_user_id: "learner-1" });
  expect(from).not.toHaveBeenCalledWith("practice_sessions");
});

it("loads topic availability as grouped rows rather than every active question", async () => {
  await getAvailableTopics("learner-1");

  expect(rpc).toHaveBeenCalledWith("get_general_topic_availability");
  expect(from).not.toHaveBeenCalledWith("questions");
});
