import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { scenarioAvatar, scenarioCards } from "./catalog";
import { conversationScenarios } from "./scenario";

describe("scenario catalog cards", () => {
  it("gives every scenario Vietnamese card copy and existing art", () => {
    expect(scenarioCards.map((card) => card.key)).toEqual(conversationScenarios.map((scenario) => scenario.key));
    for (const card of scenarioCards) {
      expect(card.title).not.toBe(card.englishTitle);
      expect(existsSync(join(process.cwd(), "public", card.image))).toBe(true);
    }
  });
});

describe("scenario avatars", () => {
  it("has a portrait file for every catalog scenario and none for unknown keys", () => {
    for (const scenario of conversationScenarios) {
      expect(existsSync(join(process.cwd(), "public", scenarioAvatar(scenario.key)!))).toBe(true);
    }
    expect(scenarioAvatar("retired-v1")).toBeUndefined();
  });
});
