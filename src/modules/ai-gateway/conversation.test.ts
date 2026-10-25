import { afterEach, expect, it, vi } from "vitest";
import { OpenAIConversationProvider } from "./conversation";
import { conversationScenarios } from "../conversation/scenario";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("uses the saved social scenario, full dialogue, and scenario goal schema", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const scenario = { ...conversationScenarios[6], context: "Saved context from this session" };
  const history = [{ role: "assistant" as const, content: scenario.opening }, { role: "user" as const, content: "I love hiking. What about you?" }];
  const request = vi.fn(async () => new Response(JSON.stringify({ output_text: JSON.stringify({ reply: "I enjoy it too.", completedGoals: [scenario.goals[0].id] }) })));
  vi.stubGlobal("fetch", request);
  await new OpenAIConversationProvider().reply(history, [], scenario);
  const body = JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  expect(body.input).toEqual(history);
  expect(body.instructions).toContain(scenario.aiRole);
  expect(body.instructions).toContain(scenario.context);
  expect(body.instructions).toContain(scenario.instructions);
  expect(body.instructions).toContain("Ask at most one clear follow-up question");
  expect(body.instructions).toContain("no grammar corrections");
  expect(body.text.format.schema.properties.completedGoals.items.enum).toEqual(scenario.goals.map(goal => goal.id));
});
