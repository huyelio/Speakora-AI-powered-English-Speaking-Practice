import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ConversationSessionView } from "./conversation-session";
import { airplaneScenario, conversationScenarios } from "../../modules/conversation/scenario";
import { ScenarioCatalog } from "./scenario-catalog";
import { SpeakingTabs } from "./speaking-tabs";

describe("role-play introduction", () => {
  it("enters a situation with a start action, without exercise configuration fields", () => {
    const html = renderToStaticMarkup(<ConversationSessionView initialSessionId={null} initialScenario={airplaneScenario} />);
    expect(html).toContain("An airplane chat");
    expect(html).toContain("Bắt đầu hội thoại");
    expect(html).toContain("Hành khách bên cạnh");
    expect(html).toContain("travel.webp");
    expect(html).toContain("0/2");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
});

it("shows all ten scenarios without starting a conversation", () => {
  const html = renderToStaticMarkup(<ScenarioCatalog />);
  for (const scenario of conversationScenarios) {
    expect(html).toContain(scenario.title);
    expect(html).toContain(`?scenario=${scenario.key}`);
  }
  expect(html).not.toContain("Bắt đầu hội thoại");
});

it("uses the selected social scenario and its goal count in the shared introduction", () => {
  const social = { ...conversationScenarios[6], goals: [conversationScenarios[6].goals[0]] };
  const html = renderToStaticMarkup(<ConversationSessionView initialSessionId={null} initialScenario={social} />);
  expect(html).toContain(social.title);
  expect(html).toContain("0/1");
  expect(html).not.toContain("An airplane chat");
});

it("provides separate Speaking mode links with the active mode marked", () => {
  const html = renderToStaticMarkup(<SpeakingTabs active="roleplay" />);
  expect(html).toContain('href="/speaking?tab=topics"');
  const current = html.match(/<a [^>]*aria-current="page"[^>]*>/g) ?? [];
  expect(current).toHaveLength(1);
  expect(current[0]).toContain('href="/speaking?tab=roleplay"');
});
