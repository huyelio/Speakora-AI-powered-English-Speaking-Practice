import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRequestUser, getAvailableTopics } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  getAvailableTopics: vi.fn(),
}));

vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser }));
vi.mock("../../../modules/topics/repository", () => ({ getAvailableTopics }));

import { GET } from "./route";

describe("GET /api/topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated request instead of accepting a caller-provided user", async () => {
    getRequestUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/topics?userId=other-user"));

    expect(response.status).toBe(401);
    expect(getAvailableTopics).not.toHaveBeenCalled();
  });

  it("rejects an unsupported learner level", async () => {
    getRequestUser.mockResolvedValue({ id: "user-1" });

    const response = await GET(new Request("http://localhost/api/topics?level=EXPERT"));

    expect(response.status).toBe(400);
    expect(getAvailableTopics).not.toHaveBeenCalled();
  });

  it("passes normalized filters and the authenticated user to the repository", async () => {
    getRequestUser.mockResolvedValue({ id: "user-1" });
    getAvailableTopics.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/topics?search=%20travel%20&level=beginner"));

    expect(response.status).toBe(200);
    expect(getAvailableTopics).toHaveBeenCalledWith("user-1", { search: "travel", level: "BEGINNER" });
  });
});
