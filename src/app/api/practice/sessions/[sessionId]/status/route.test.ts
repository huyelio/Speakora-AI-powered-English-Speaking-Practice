import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeSession, getSessionStatus, resolveSessionPrincipal } = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  getSessionStatus: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));

vi.mock("../../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../../modules/practice/repository", () => ({ authorizeSession, getSessionStatus }));

import { GET } from "./route";

const params = { params: Promise.resolve({ sessionId: "session-1" }) };
const request = () => new Request("http://localhost/api/practice/sessions/session-1/status");

describe("GET /api/practice/sessions/:sessionId/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    getSessionStatus.mockResolvedValue({ sessionId: "session-1", completed: 1 });
  });

  it("returns the status for an owned session", async () => {
    authorizeSession.mockResolvedValue({ id: "session-1" });
    const response = await GET(request(), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sessionId: "session-1", completed: 1 });
  });

  it("returns 404 without the status when ownership fails", async () => {
    authorizeSession.mockResolvedValue(null);
    const response = await GET(request(), params);
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("completed");
  });

  it("returns 404 rather than a status error when ownership fails", async () => {
    authorizeSession.mockResolvedValue(null);
    getSessionStatus.mockRejectedValue(new Error("missing session"));
    const response = await GET(request(), params);
    expect(response.status).toBe(404);
  });
});
