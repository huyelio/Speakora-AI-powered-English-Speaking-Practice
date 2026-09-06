import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRequestUser, getHistory, decodeHistoryCursor } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  getHistory: vi.fn(),
  decodeHistoryCursor: vi.fn(),
}));

vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser }));
vi.mock("../../../modules/dashboard/repository", () => ({ getHistory, decodeHistoryCursor }));

import { GET } from "./route";

describe("GET /api/history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not accept a caller-provided user id as authority", async () => {
    getRequestUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/history?userId=other-user"));

    expect(response.status).toBe(401);
    expect(getHistory).not.toHaveBeenCalled();
  });

  it("rejects an invalid opaque cursor before querying history", async () => {
    getRequestUser.mockResolvedValue({ id: "learner-1" });
    decodeHistoryCursor.mockImplementation(() => { throw new Error("Invalid history cursor."); });

    const response = await GET(new Request("http://localhost/api/history?cursor=bad"));

    expect(response.status).toBe(400);
    expect(getHistory).not.toHaveBeenCalled();
  });

  it("loads the next page for the authenticated learner", async () => {
    const cursor = { createdAt: "2026-08-21T00:00:00.000Z", id: "24fbfe37-d670-4e39-909a-0cbfdb2a37fa" };
    getRequestUser.mockResolvedValue({ id: "learner-1" });
    decodeHistoryCursor.mockReturnValue(cursor);
    getHistory.mockResolvedValue({ items: [], nextCursor: null });

    const response = await GET(new Request("http://localhost/api/history?cursor=opaque"));

    expect(response.status).toBe(200);
    expect(getHistory).toHaveBeenCalledWith("learner-1", { cursor });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
