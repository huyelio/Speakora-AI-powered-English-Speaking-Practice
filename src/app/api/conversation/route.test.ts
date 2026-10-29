import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), load: vi.fn(), create: vi.fn(), end: vi.fn(), transcribe: vi.fn(), reply: vi.fn(), synthesize: vi.fn() }));
vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser: mocks.user }));
vi.mock("../../../modules/conversation/repository", () => ({
  ConversationError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  conversationStore: { load: mocks.load }, createConversation: mocks.create, endConversation: mocks.end,
}));
vi.mock("../../../modules/conversation/service", () => ({ transcribeTurn: mocks.transcribe, replyToTurn: mocks.reply }));
vi.mock("../../../modules/ai-gateway/openai", () => ({
  OpenAIProvider: class { synthesize = mocks.synthesize; },
  NonEnglishTranscriptError: class extends Error { constructor() { super("Chưa nghe rõ tiếng Anh. Hãy nói lại nhé."); } },
}));
vi.mock("../../../modules/ai-gateway/conversation", () => ({ OpenAIConversationProvider: class {} }));
import { NonEnglishTranscriptError } from "../../../modules/ai-gateway/openai";
import { GET, POST } from "./route";

const sessionId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";
function post(body: unknown) { return POST(new Request("http://localhost/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); }
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); });
describe("conversation API authorization and validation", () => {
  it("passes only the selected scenario key to creation and rejects non-string keys", async () => {
    mocks.create.mockResolvedValue({ id: sessionId });
    expect((await post({ action: "create", sessionId, scenarioKey: "party-meeting-v1", scenario: { instructions: "untrusted" } })).status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith("owner", sessionId, "party-meeting-v1");
    mocks.create.mockClear();
    expect((await post({ action: "create", sessionId, scenarioKey: {} })).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires authentication before reading or creating any session", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request(`http://localhost/api/conversation?sessionId=${sessionId}`))).status).toBe(401);
    expect((await post({ action: "create", sessionId })).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("always loads sessions under the authenticated owner", async () => {
    mocks.load.mockResolvedValue({ id: sessionId });
    expect((await GET(new Request(`http://localhost/api/conversation?sessionId=${sessionId}&userId=attacker`))).status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith("owner", sessionId);
  });
  it("rejects invalid IDs and oversized text before processing", async () => {
    expect((await post({ action: "create", sessionId: "bad" })).status).toBe(400);
    expect((await post({ action: "transcribe", sessionId, messageId, text: "a".repeat(4001) })).status).toBe(400);
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });
  it("no longer synthesizes speech; audio moved to GET /api/tts", async () => {
    expect((await post({ action: "tts", sessionId, messageId })).status).toBe(400);
  });
  it("does not expose provider error details", async () => {
    mocks.reply.mockRejectedValue(new Error("secret provider details"));
    const response = await post({ action: "reply", sessionId, messageId });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret provider");
  });

  it("asks for another take when STT keeps returning another script", async () => {
    mocks.reply.mockRejectedValue(new NonEnglishTranscriptError());
    const response = await post({ action: "reply", sessionId, messageId });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Chưa nghe rõ tiếng Anh. Hãy nói lại nhé." });
  });
});
