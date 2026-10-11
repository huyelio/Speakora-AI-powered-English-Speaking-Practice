import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient: () => ({ from, rpc }) }));
vi.mock("../topics/repository", () => ({ getAvailableTopics: async () => [] }));
import { getDashboard, getHistory } from "./repository";

const queries = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
beforeEach(() => {
  vi.clearAllMocks();
  queries.clear();
  rpc.mockResolvedValue({ data: 0, error: null });
  from.mockImplementation((table: string) => {
    const data = table === "profiles" ? { display_name: "Learner", level: "BEGINNER", timezone: "UTC" }
      : table === "learning_goals" ? { daily_answer_target: 5 }
      : ["user_streaks", "daily_progress"].includes(table) ? null : [];
    const result = { data, error: null };
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "or", "order", "limit"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue(result);
    query.then = vi.fn((resolve) => Promise.resolve(result).then(resolve));
    queries.set(table, query);
    return query;
  });
});

it("excludes checks from both dashboard recent practice and recommendation assessments", async () => {
  await getDashboard("owner", new Date("2026-10-11T00:00:00Z"));
  expect(queries.get("practice_sessions")?.or).toHaveBeenCalledWith("session_kind.is.null,session_kind.neq.QUICK_CHECK");
  expect(queries.get("session_assessments")?.or).toHaveBeenCalledWith("session_kind.is.null,session_kind.neq.QUICK_CHECK", { referencedTable: "practice_sessions" });
});

it("retains the check exclusion when history adds a pagination cursor", async () => {
  await getHistory("owner", { cursor: { createdAt: "2026-10-11T00:00:00Z", id: "00000000-0000-4000-8000-000000000001" } });
  const query = queries.get("practice_sessions")!;
  expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
  expect(query.or.mock.calls).toEqual([
    ["session_kind.is.null,session_kind.neq.QUICK_CHECK"],
    ["created_at.lt.2026-10-11T00:00:00Z,and(created_at.eq.2026-10-11T00:00:00Z,id.lt.00000000-0000-4000-8000-000000000001)"],
  ]);
});
