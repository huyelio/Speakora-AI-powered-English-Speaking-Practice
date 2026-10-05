import { describe, expect, it } from "vitest";
import { parseConversationReply, mergeGoals } from "./scenario";

describe("conversation output", () => {
  it("accepts contextual reply and only known goal IDs", () => {
    expect(parseConversationReply({ reply: "Tokyo sounds fun! What will you do there?", completedGoals: ["destination_reason"] })).toEqual({ reply: "Tokyo sounds fun! What will you do there?", completedGoals: ["destination_reason"] });
    expect(() => parseConversationReply({ reply: "Hi", completedGoals: ["invented"] })).toThrow();
  });
  it("rejects empty or excessive AI replies", () => {
    expect(() => parseConversationReply({ reply: " ", completedGoals: [] })).toThrow();
    expect(() => parseConversationReply({ reply: "a".repeat(1001), completedGoals: [] })).toThrow();
  });
  it("preserves achieved goals when subsequent replies omit them", () => {
    expect(mergeGoals(["destination_reason"], ["looking_forward", "destination_reason"])).toEqual(["destination_reason", "looking_forward"]);
    expect(mergeGoals(["destination_reason"], [])).toEqual(["destination_reason"]);
  });
});
