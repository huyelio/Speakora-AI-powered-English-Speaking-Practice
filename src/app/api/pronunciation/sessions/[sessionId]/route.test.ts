import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getClientPronunciationSession, resolveSessionPrincipal } = vi.hoisted(() => ({
  getClientPronunciationSession: vi.fn(),
  resolveSessionPrincipal: vi.fn(),
}));
vi.mock("../../../../../modules/practice/auth", () => ({ resolveSessionPrincipal }));
vi.mock("../../../../../modules/pronunciation-practice/repository", () => ({ getClientPronunciationSession }));

import { GET } from "./route";

const sessionId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/pronunciation/sessions/:sessionId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated user", async () => {
    resolveSessionPrincipal.mockResolvedValue(null);
    const response = await invoke();
    expect(response.status).toBe(401);
    expect(getClientPronunciationSession).not.toHaveBeenCalled();
  });

  it("returns only the owned client session", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    getClientPronunciationSession.mockResolvedValue({ sessionId, items: [] });
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(getClientPronunciationSession).toHaveBeenCalledWith(sessionId, "user-1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps another user's session indistinguishable from a missing one", async () => {
    resolveSessionPrincipal.mockResolvedValue({ kind: "user", userId: "user-1" });
    getClientPronunciationSession.mockResolvedValue(null);
    expect((await invoke()).status).toBe(404);
  });
});

function invoke() {
  return GET(new Request(`http://localhost/api/pronunciation/sessions/${sessionId}`), {
    params: Promise.resolve({ sessionId }),
  });
}
