import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { EnglishSkill } from "../../modules/profile/english-skills";
import { EnglishSkills } from "./english-skills";

const skills: EnglishSkill[] = [
  { key: "listening", label: "Listening", status: "NOT_ASSESSED" },
  {
    key: "speaking",
    label: "Speaking",
    status: "ASSESSED",
    value: "B1",
    scale: "CEFR",
    source: "Quick Speaking Check",
    assessedAt: "2026-10-20T03:00:00Z",
    sessionId: "quick-1",
  },
  { key: "reading", label: "Reading", status: "NOT_ASSESSED" },
  { key: "writing", label: "Writing", status: "NOT_ASSESSED" },
];

it("renders all four skills with the real assessed value and explicit missing states", () => {
  const html = renderToStaticMarkup(<EnglishSkills skills={skills} timezone="Asia/Ho_Chi_Minh" />);

  for (const label of ["English Skills", "Listening", "Speaking", "Reading", "Writing"]) {
    expect(html).toContain(label);
  }
  expect(html).toContain("B1");
  expect(html).toContain("CEFR");
  expect(html).toContain("Quick Speaking Check");
  expect(html).toContain("20/10/2026");
  expect(html).toContain('href="/history/quick-1"');
  expect(html).toContain('class="english-skills-radar"');
  expect(html).toContain('aria-label="Speaking: B1, CEFR"');
  expect(html.match(/data-skill-status="NOT_ASSESSED"/g)).toHaveLength(3);
  expect(html).not.toContain("0%");
  expect(html).not.toContain("<strong>0.0</strong>");
  expect(html).not.toContain("english-skills-grid");
});

it("distinguishes an unavailable read from skills that have not been assessed", () => {
  const html = renderToStaticMarkup(<EnglishSkills skills={skills} unavailable />);

  expect(html.match(/Unavailable/g)).toHaveLength(4);
  expect(html).not.toContain("Not assessed");
  expect(html).not.toContain("B1");
  expect(html).not.toContain('/history/quick-1');
  expect(html).toContain('class="english-skills-radar"');
});
