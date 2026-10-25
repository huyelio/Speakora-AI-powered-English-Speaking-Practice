import { describe, expect, it } from "vitest";
import type { EnglishSkill } from "./english-skills";
import {
  normalizeEnglishSkillsForRadar,
  normalizeEnglishSkillValue,
} from "./english-skills-visualization";

describe("English skills radar normalization", () => {
  it("maps CEFR and IELTS values to chart geometry without replacing their original values", () => {
    expect(normalizeEnglishSkillValue("B1", "CEFR")).toBe(50);
    expect(normalizeEnglishSkillValue("C2", "CEFR")).toBe(100);
    expect(normalizeEnglishSkillValue("6.5", "IELTS band estimate")).toBeCloseTo(72.22, 2);
  });

  it("uses zero only as geometry for unassessed axes and labels them explicitly", () => {
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

    expect(normalizeEnglishSkillsForRadar(skills)).toEqual([
      { key: "listening", label: "Listening", plotValue: 0, displayValue: "Not assessed", status: "NOT_ASSESSED", skill: skills[0] },
      { key: "speaking", label: "Speaking", plotValue: 50, displayValue: "B1 · CEFR", status: "ASSESSED", skill: skills[1] },
      { key: "reading", label: "Reading", plotValue: 0, displayValue: "Not assessed", status: "NOT_ASSESSED", skill: skills[2] },
      { key: "writing", label: "Writing", plotValue: 0, displayValue: "Not assessed", status: "NOT_ASSESSED", skill: skills[3] },
    ]);
  });

  it("keeps unavailable data distinct from a real zero or an unassessed skill", () => {
    const skills: EnglishSkill[] = [
      { key: "listening", label: "Listening", status: "NOT_ASSESSED" },
      { key: "speaking", label: "Speaking", status: "NOT_ASSESSED" },
      { key: "reading", label: "Reading", status: "NOT_ASSESSED" },
      { key: "writing", label: "Writing", status: "NOT_ASSESSED" },
    ];

    expect(normalizeEnglishSkillsForRadar(skills, true).map(({ plotValue, displayValue, status }) => ({ plotValue, displayValue, status }))).toEqual([
      { plotValue: 0, displayValue: "Unavailable", status: "UNAVAILABLE" },
      { plotValue: 0, displayValue: "Unavailable", status: "UNAVAILABLE" },
      { plotValue: 0, displayValue: "Unavailable", status: "UNAVAILABLE" },
      { plotValue: 0, displayValue: "Unavailable", status: "UNAVAILABLE" },
    ]);
  });
});
