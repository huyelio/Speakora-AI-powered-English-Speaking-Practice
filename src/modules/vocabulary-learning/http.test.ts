import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../practice/auth", () => ({ resolveSessionPrincipal: vi.fn() }));
import { resolveSessionPrincipal } from "../practice/auth";
import { learningRequest, readCreateInput, readMutationInput } from "./http";
const id = "10000000-0000-4000-8000-000000000001";
describe("V2 transport", () => {
  it("canonicalizes UUID selectors so identical retries compare consistently", () => {
    const upper = "ABCDEF00-0000-4000-8000-000000000001";
    const input = readCreateInput({ topicId: upper, requestId: upper, sourceSessionId: upper, level: "BEGINNER" });
    expect([input.topicId, input.requestId, input.sourceSessionId]).toEqual(Array(3).fill(upper.toLowerCase()));
  });
  it("rejects malformed selectors and stages before repository work", () => {
    expect(() => readCreateInput({ topicId: id, level: "C2", requestId: id })).toThrow();
    expect(() => readCreateInput({ topicId: id, level: "BEGINNER", requestId: id, selection: "ALL" })).toThrow();
    expect(() => readMutationInput({ stage: "SUMMARY", sessionItemId: id }, "advance")).toThrow();
    expect(() => readMutationInput({ stage: "RECALL", sessionItemId: id, answer: 123 }, "answer")).toThrow();
    expect(readMutationInput({ stage: "RECALL", sessionItemId: id, answer: " \tTRAVEL\n" }, "answer").answer).toBe("travel");
  });
  it("rejects guests without executing work and sanitizes infrastructure errors", async () => {
    vi.mocked(resolveSessionPrincipal).mockResolvedValue(null);
    const work = vi.fn();
    expect((await learningRequest(new Request("https://local"), work)).status).toBe(401);
    expect(work).not.toHaveBeenCalled();
    vi.mocked(resolveSessionPrincipal).mockResolvedValue({ kind: "user", userId: id });
    const response = await learningRequest(new Request("https://local"), async () => { throw new Error("database secret"); });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("database secret");
  });
});
