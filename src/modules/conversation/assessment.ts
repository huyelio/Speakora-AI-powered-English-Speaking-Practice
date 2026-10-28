import type { ConversationMessage } from "./scenario";

/** Fewer learner turns than this give too little evidence for feedback, stars or rewards. */
export const MIN_ASSESSED_TURNS = 3;

export const conversationCriteria = ["fluency_coherence", "lexical_resource", "grammatical_range_accuracy", "interaction"] as const;
export type ConversationCriterion = (typeof conversationCriteria)[number];
export const conversationLevels = ["GOOD", "FAIR", "NEEDS_WORK"] as const;
export type ConversationLevel = (typeof conversationLevels)[number];

export type ConversationCriterionFeedback = {
  level: ConversationLevel;
  summary: string;
  example: { original: string; corrected: string } | null;
};
export type ConversationAssessment = {
  overall_feedback: string;
  criteria: Record<ConversationCriterion, ConversationCriterionFeedback>;
  rewrites: { original: string; natural: string }[];
  useful_phrases: string[];
};

const criterionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    level: { type: "string", enum: conversationLevels },
    summary: { type: "string" },
    example: {
      anyOf: [
        { type: "null" },
        { type: "object", additionalProperties: false, properties: { original: { type: "string" }, corrected: { type: "string" } }, required: ["original", "corrected"] },
      ],
    },
  },
  required: ["level", "summary", "example"],
} as const;

export const conversationAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall_feedback: { type: "string" },
    criteria: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(conversationCriteria.map((key) => [key, criterionSchema])),
      required: conversationCriteria,
    },
    rewrites: {
      type: "array",
      items: { type: "object", additionalProperties: false, properties: { original: { type: "string" }, natural: { type: "string" } }, required: ["original", "natural"] },
    },
    useful_phrases: { type: "array", items: { type: "string" } },
  },
  required: ["overall_feedback", "criteria", "rewrites", "useful_phrases"],
} as const;

/** Case- and spacing-insensitive form used to check that quotes come from the learner's turns. */
const normalize = (value: string) => value.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid conversation assessment.");
  return value.trim();
}
function quoted(value: unknown, evidence: string): string {
  const original = text(value, 200);
  if (!evidence.includes(normalize(original))) throw new Error(`Assessment quote not found in learner turns: ${original}`);
  return original;
}

/** Validates model output against the learner's own turns before anything is saved. */
export function parseConversationAssessment(value: unknown, learnerTurns: readonly string[]): ConversationAssessment {
  if (!isRecord(value) || !isRecord(value.criteria)) throw new Error("Invalid conversation assessment.");
  const evidence = normalize(learnerTurns.join("\n"));
  const criteria = Object.fromEntries(conversationCriteria.map((key) => {
    const item = (value.criteria as Record<string, unknown>)[key];
    if (!isRecord(item) || !conversationLevels.includes(item.level as ConversationLevel)) throw new Error("Invalid conversation assessment.");
    const example = item.example === null ? null
      : isRecord(item.example) ? { original: quoted(item.example.original, evidence), corrected: text(item.example.corrected, 200) }
      : (() => { throw new Error("Invalid conversation assessment."); })();
    return [key, { level: item.level as ConversationLevel, summary: text(item.summary, 300), example }];
  })) as ConversationAssessment["criteria"];
  if (!Array.isArray(value.rewrites) || value.rewrites.length > 3 || !Array.isArray(value.useful_phrases) || value.useful_phrases.length > 4) {
    throw new Error("Invalid conversation assessment.");
  }
  return {
    overall_feedback: text(value.overall_feedback, 600),
    criteria,
    rewrites: value.rewrites.map((item) => {
      if (!isRecord(item)) throw new Error("Invalid conversation assessment.");
      return { original: quoted(item.original, evidence), natural: text(item.natural, 200) };
    }),
    useful_phrases: value.useful_phrases.map((item) => text(item, 80)),
  };
}

/** Stars come from goals, never from the model: all goals 3, at least half 2, otherwise 1; 0 when too short. */
export function conversationStars(completedGoals: number, totalGoals: number, learnerTurns: number): 0 | 1 | 2 | 3 {
  if (learnerTurns < MIN_ASSESSED_TURNS || totalGoals < 1) return 0;
  if (completedGoals >= totalGoals) return 3;
  return completedGoals * 2 >= totalGoals ? 2 : 1;
}

/** Free statistics from the transcript; no model call. */
export function conversationStats(messages: readonly Pick<ConversationMessage, "role" | "content">[]) {
  const turns = messages.filter((message) => message.role === "user" && message.content.trim());
  const words = turns.reduce((sum, message) => sum + message.content.trim().split(/\s+/).length, 0);
  return {
    turns: turns.length,
    averageWords: turns.length ? Math.round(words / turns.length) : 0,
    questions: turns.filter((message) => message.content.includes("?")).length,
  };
}
