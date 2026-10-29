import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "../../modules/conversation/scenario";
import { SILENT_WAV, freshAssistantLine, showsAvatar } from "./chat-model";

const line = (id: string, role: ConversationMessage["role"], content = "Hi"): ConversationMessage =>
  ({ id, role, content, turn_index: 0, processing_status: "COMPLETED", completed_goals: [] });

describe("freshAssistantLine", () => {
  it("finds the reply a turn added, ignoring lines already shown", () => {
    const before = [line("a1", "assistant"), line("u1", "user")];
    expect(freshAssistantLine(before, [...before, line("a2", "assistant")])).toBe("a2");
  });

  it("returns the opening line of a new session and nothing when no reply was added", () => {
    expect(freshAssistantLine([], [line("a1", "assistant")])).toBe("a1");
    const before = [line("a1", "assistant")];
    expect(freshAssistantLine(before, [...before, line("u1", "user")])).toBeNull();
    expect(freshAssistantLine(before, [...before, line("a2", "assistant", "")])).toBeNull();
  });
});

describe("showsAvatar", () => {
  it("puts the avatar on the last bubble of each run", () => {
    const roles: ConversationMessage["role"][] = ["assistant", "assistant", "user", "assistant"];
    expect(roles.map((_, index) => showsAvatar(roles, index))).toEqual([false, true, true, true]);
  });
});

it("builds a playable silent WAV data URI", () => {
  expect(SILENT_WAV).toMatch(/^data:audio\/wav;base64,UklGR/);
});
