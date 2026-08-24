import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeSession, getSupabaseAdminClient, resolveSessionPrincipal, rpc } = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../../../../../../lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/practice/repository", () => ({ authorizeSession }));

import { POST } from "./route";

const principal = { kind: "user", userId: "user-1" } as const;

describe("POST /api/practice/sessions/:sessionId/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSessionPrincipal.mockResolvedValue(principal);
    authorizeSession.mockResolvedValue({ id: "session-1" });
    getSupabaseAdminClient.mockReturnValue({ rpc });
  });

  it("does not invoke the retry transaction for an unauthorized session", async () => {
    authorizeSession.mockResolvedValue(null);

    const response = await invoke();

    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("delegates all retry state changes to the atomic service-role RPC", async () => {
    rpc.mockResolvedValue({ data: 2, error: null });

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("retry_failed_processing_jobs", {
      p_session_id: "session-1",
    });
    expect(await response.json()).toEqual({ retried: 2 });
  });

  it("leaves an ineligible or jobless session unchanged when the RPC returns zero", async () => {
    rpc.mockResolvedValue({ data: 0, error: null });

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ retried: 0 });
  });
});

function invoke() {
  return POST(new Request("http://localhost/api/practice/sessions/session-1/retry", {
    method: "POST",
  }), {
    params: Promise.resolve({ sessionId: "session-1" }),
  });
}
