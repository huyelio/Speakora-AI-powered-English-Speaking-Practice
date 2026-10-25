import type { EnglishSkill, EnglishSkillKey } from "./english-skills";

export const englishSkillAxes: ReadonlyArray<{
  key: EnglishSkillKey;
  label: string;
}> = [
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
];

export type EnglishSkillRadarDatum = {
  key: EnglishSkillKey;
  label: string;
  plotValue: number;
  displayValue: string;
  status: "ASSESSED" | "NOT_ASSESSED" | "UNAVAILABLE";
  skill: EnglishSkill;
};

const cefrVisualizationValues: Record<string, number> = {
  A1: 100 / 6,
  A2: 200 / 6,
  B1: 300 / 6,
  B2: 400 / 6,
  C1: 500 / 6,
  C2: 100,
};

export function normalizeEnglishSkillValue(
  value: string,
  scale: "CEFR" | "IELTS band estimate",
): number {
  if (scale === "CEFR") return cefrVisualizationValues[value] ?? 0;
  const band = Number(value);
  if (!Number.isFinite(band)) return 0;
  return (Math.min(9, Math.max(0, band)) / 9) * 100;
}

export function normalizeEnglishSkillsForRadar(
  skills: EnglishSkill[],
  unavailable = false,
): EnglishSkillRadarDatum[] {
  const byKey = new Map(skills.map((skill) => [skill.key, skill]));

  return englishSkillAxes.map(({ key, label }) => {
    const skill = byKey.get(key) ?? { key, label, status: "NOT_ASSESSED" as const };
    if (unavailable) {
      return { key, label, plotValue: 0, displayValue: "Unavailable", status: "UNAVAILABLE", skill };
    }
    if (skill.status === "NOT_ASSESSED") {
      return { key, label, plotValue: 0, displayValue: "Not assessed", status: "NOT_ASSESSED", skill };
    }
    return {
      key,
      label,
      plotValue: normalizeEnglishSkillValue(skill.value, skill.scale),
      displayValue: `${skill.value} · ${skill.scale}`,
      status: "ASSESSED",
      skill,
    };
  });
}
