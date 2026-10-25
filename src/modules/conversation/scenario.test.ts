import { describe, expect, it } from "vitest";
import { parseConversationReply, mergeGoals, conversationScenarios, parseScenarioSnapshot } from "./scenario";

it("has ten unique scenarios and validates goals against the selected scenario", () => {
  expect(conversationScenarios).toHaveLength(10);
  expect(new Set(conversationScenarios.map(s => s.key)).size).toBe(10);
  for (const scenario of conversationScenarios) {
    expect(parseScenarioSnapshot(scenario)).toEqual(scenario);
    expect(new Set(scenario.goals.map(goal => goal.id)).size).toBe(scenario.goals.length);
  }
  const cafe = conversationScenarios.find(s => s.key === "ordering-at-a-cafe-v1")!;
  expect(parseConversationReply({ reply: "Certainly!", completedGoals: [cafe.goals[0].id] }, cafe).completedGoals).toEqual([cafe.goals[0].id]);
  expect(() => parseConversationReply({ reply: "Certainly!", completedGoals: ["destination_reason"] }, cafe)).toThrow();
});

it("preserves a stored airplane snapshot and adds defaults for legacy fields", () => {
  const snapshot = { key: "airplane-chat-v1", title: "Saved title", duration: "3–7 phút", description: "Saved context", aiRole: "Passenger", learnerRole: "Traveller", opening: "Saved opening", goals: [{ id: "destination_reason", label: "Saved goal", hint: "Saved hint" }] };
  const restored = parseScenarioSnapshot(snapshot);
  expect(restored.title).toBe("Saved title");
  expect(restored.opening).toBe("Saved opening");
  expect(restored.goals[0].label).toBe("Saved goal");
  expect(restored.goals[0].criterion).toBeTruthy();
});

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
