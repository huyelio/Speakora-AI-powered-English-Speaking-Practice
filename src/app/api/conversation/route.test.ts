import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), load: vi.fn(), create: vi.fn(), end: vi.fn(), transcribe: vi.fn(), reply: vi.fn(), synthesize: vi.fn() }));
vi.mock("../../../lib/supabase/auth-server", () => ({ getRequestUser: mocks.user }));
vi.mock("../../../modules/conversation/repository", () => ({
  ConversationError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  conversationStore: { load: mocks.load }, createConversation: mocks.create, endConversation: mocks.end,
}));
vi.mock("../../../modules/conversation/service", () => ({ transcribeTurn: mocks.transcribe, replyToTurn: mocks.reply }));
vi.mock("../../../modules/ai-gateway/openai", () => ({ OpenAIProvider: class { synthesize = mocks.synthesize; } }));
vi.mock("../../../modules/ai-gateway/conversation", () => ({ OpenAIConversationProvider: class {} }));
import { GET, POST } from "./route";

const sessionId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";
function post(body: unknown) { return POST(new Request("http://localhost/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); }
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); });
describe("conversation API authorization and validation", () => {
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
  it("refuses to synthesize user text or an unknown message", async () => {
    mocks.load.mockResolvedValue({ messages: [{ id: messageId, role: "user", content: "private learner text" }] });
    expect((await post({ action: "tts", sessionId, messageId, text: "arbitrary" })).status).toBe(404);
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("reads TTS content from the owned assistant message", async () => {
    mocks.load.mockResolvedValue({ messages: [{ id: messageId, role: "assistant", content: "A friendly reply." }] });
    mocks.synthesize.mockResolvedValue(new ArrayBuffer(2));
    const result = await post({ action: "tts", sessionId, messageId, text: "ignore this" });
    expect(result.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(mocks.synthesize).toHaveBeenCalledWith("A friendly reply.", expect.any(Object));
  });
  it("does not expose provider error details", async () => {
    mocks.reply.mockRejectedValue(new Error("secret provider details"));
    const response = await post({ action: "reply", sessionId, messageId });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret provider");
  });
});
