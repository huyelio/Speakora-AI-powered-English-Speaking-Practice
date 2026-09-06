import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRequestUser, getDashboard } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  getDashboard: vi.fn(),
}));

vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser }));
vi.mock("../../../modules/dashboard/repository", () => ({ getDashboard }));

import { GET } from "./route";

describe("GET /api/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authenticates before loading any learner dashboard data", async () => {
    getRequestUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it("uses only the authenticated user identity", async () => {
    getRequestUser.mockResolvedValue({ id: "learner-1" });
    getDashboard.mockResolvedValue({ recentSessions: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(getDashboard).toHaveBeenCalledWith("learner-1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

