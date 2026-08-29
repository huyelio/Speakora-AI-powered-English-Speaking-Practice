import type { CriterionFeedback } from "./schema";

export const generalRecommendationTags = [
  "FLUENCY",
  "COHERENCE",
  "VOCABULARY",
  "GRAMMAR",
  "DAILY_ROUTINE",
  "FAMILY_AND_FRIENDS",
  "FOOD_AND_COOKING",
  "SHOPPING",
  "TRAVEL",
  "TRANSPORTATION",
  "WORK",
  "STUDY",
  "HOBBIES",
  "HOME_AND_NEIGHBORHOOD",
  "HEALTH_AND_FITNESS",
  "MOVIES_AND_MUSIC",
  "TECHNOLOGY",
  "SOCIAL_SITUATIONS",
  "FUTURE_PLANS",
] as const;

export type GeneralRecommendationTag = (typeof generalRecommendationTags)[number];

export type GeneralAssessmentOutput = {
  overall_feedback: string;
  criteria: {
    fluency_coherence: CriterionFeedback;
    lexical_resource: CriterionFeedback;
    grammatical_range_accuracy: CriterionFeedback;
  };
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  useful_phrase: string;
  recommendation_tags: GeneralRecommendationTag[];
};

const criterionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", maxLength: 240 },
    example: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            original: { type: "string", maxLength: 160 },
            corrected: { anyOf: [{ type: "string", maxLength: 160 }, { type: "null" }] },
          },
          required: ["original", "corrected"],
        },
      ],
    },
  },
  required: ["summary", "example"],
} as const;

export const generalAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall_feedback: { type: "string" },
    criteria: {
      type: "object",
      additionalProperties: false,
      properties: {
        fluency_coherence: criterionSchema,
        lexical_resource: criterionSchema,
        grammatical_range_accuracy: criterionSchema,
      },
      required: ["fluency_coherence", "lexical_resource", "grammatical_range_accuracy"],
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
    useful_phrase: { type: "string", maxLength: 160 },
    recommendation_tags: {
      type: "array",
      items: { type: "string", enum: generalRecommendationTags },
    },
  },
  required: [
    "overall_feedback",
    "criteria",
    "strengths",
    "improvements",
    "next_steps",
    "useful_phrase",
    "recommendation_tags",
  ],
} as const;

const outputKeys = [
  "overall_feedback",
  "criteria",
  "strengths",
  "improvements",
  "next_steps",
  "useful_phrase",
  "recommendation_tags",
] as const;
const criterionKeys = ["fluency_coherence", "lexical_resource", "grammatical_range_accuracy"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new Error(`Invalid General assessment output: unexpected property ${unexpected}.`);
  const missing = allowed.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing) throw new Error(`Invalid General assessment output: missing property ${missing}.`);
}

function parseCriterion(value: unknown, transcriptEvidence?: string): CriterionFeedback {
  if (!isRecord(value)) throw new Error("Invalid General assessment output.");
  assertExactKeys(value, ["summary", "example"]);
  if (typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 240) {
    throw new Error("Invalid General assessment output.");
  }
  if (value.example === null) return value as CriterionFeedback;
  if (!isRecord(value.example)) throw new Error("Invalid General assessment output.");
  assertExactKeys(value.example, ["original", "corrected"]);
  const { original, corrected } = value.example;
  if (
    typeof original !== "string"
    || !original.trim()
    || original.length > 160
    || (corrected !== null && (typeof corrected !== "string" || corrected.length > 160))
  ) throw new Error("Invalid General assessment output.");
  if (transcriptEvidence !== undefined && !transcriptEvidence.includes(original)) {
    throw new Error(`Assessment example not found in transcript: ${original}`);
  }
  return value as CriterionFeedback;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseGeneralAssessmentOutput(
  value: unknown,
  transcriptEvidence?: string,
): GeneralAssessmentOutput {
  if (!isRecord(value)) throw new Error("Invalid General assessment output.");
  assertExactKeys(value, outputKeys);
  if (!isRecord(value.criteria)) throw new Error("Invalid General assessment output.");
  assertExactKeys(value.criteria, criterionKeys);

  const criteria = {
    fluency_coherence: parseCriterion(value.criteria.fluency_coherence, transcriptEvidence),
    lexical_resource: parseCriterion(value.criteria.lexical_resource, transcriptEvidence),
    grammatical_range_accuracy: parseCriterion(value.criteria.grammatical_range_accuracy, transcriptEvidence),
  };
  const tags = value.recommendation_tags;
  if (
    typeof value.overall_feedback !== "string"
    || !value.overall_feedback.trim()
    || !isStringList(value.strengths)
    || !isStringList(value.improvements)
    || !isStringList(value.next_steps)
    || typeof value.useful_phrase !== "string"
    || !value.useful_phrase.trim()
    || value.useful_phrase.length > 160
    || !Array.isArray(tags)
    || !tags.every((tag): tag is GeneralRecommendationTag => (
      typeof tag === "string" && generalRecommendationTags.includes(tag as GeneralRecommendationTag)
    ))
    || new Set(tags).size !== tags.length
  ) throw new Error("Invalid General assessment output.");

  return { ...value, criteria } as GeneralAssessmentOutput;
}
