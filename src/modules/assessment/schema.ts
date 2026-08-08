export type AssessmentOutput = {
  estimated_band: number;
  overall_feedback: string;
  criteria: {
    fluency_coherence: CriterionFeedback;
    lexical_resource: CriterionFeedback;
    grammatical_range_accuracy: CriterionFeedback;
  };
  strengths: string[];
  improvements: string[];
  next_steps: string[];
};

export type CriterionFeedback = {
  summary: string;
  example: { original: string; corrected: string | null } | null;
};

const criterionSchema = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string", maxLength: 240 },
    example: {
      anyOf: [
        { type: "null" },
        {
          type: "object", additionalProperties: false,
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

export const assessmentJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    estimated_band: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
    overall_feedback: { type: "string" },
    criteria: {
      type: "object", additionalProperties: false,
      properties: {
        fluency_coherence: criterionSchema, lexical_resource: criterionSchema,
        grammatical_range_accuracy: criterionSchema,
      },
      required: ["fluency_coherence", "lexical_resource", "grammatical_range_accuracy"],
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
  },
  required: ["estimated_band", "overall_feedback", "criteria", "strengths", "improvements", "next_steps"],
} as const;

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new Error(`Invalid assessment output: unexpected property ${unexpected}.`);
}

export function parseAssessmentOutput(value: unknown, transcriptEvidence?: string): AssessmentOutput {
  if (!value || typeof value !== "object") throw new Error("Invalid assessment output.");
  const output = value as Record<string, unknown>;
  const criteria = output.criteria as Record<string, unknown> | undefined;
  assertExactKeys(output, ["estimated_band", "overall_feedback", "criteria", "strengths", "improvements", "next_steps"]);
  if (criteria) assertExactKeys(criteria, ["fluency_coherence", "lexical_resource", "grammatical_range_accuracy"]);
  const criterionValues = criteria ? [criteria.fluency_coherence, criteria.lexical_resource, criteria.grammatical_range_accuracy] : [];
  for (const criterion of criterionValues) {
    if (!criterion || typeof criterion !== "object") throw new Error("Invalid assessment output.");
    const item=criterion as Record<string,unknown>; assertExactKeys(item,["summary","example"]);
    if(typeof item.summary!=="string"||!item.summary.trim()||item.summary.length>240)throw new Error("Invalid assessment output.");
    if(item.example!==null){
      if(!item.example||typeof item.example!=="object")throw new Error("Invalid assessment output.");
      const example=item.example as Record<string,unknown>;assertExactKeys(example,["original","corrected"]);
      if(typeof example.original!=="string"||!example.original.trim()||example.original.length>160||(example.corrected!==null&&typeof example.corrected!=="string"))throw new Error("Invalid assessment output.");
      if(transcriptEvidence!==undefined&&!transcriptEvidence.includes(example.original))throw new Error(`Assessment example not found in transcript: ${example.original}`);
    }
  }
  const band = output.estimated_band;
  if (
    typeof band !== "number" || band < 0 || band > 9 || (band * 2) % 1 !== 0 ||
    typeof output.overall_feedback !== "string" || !criteria ||
    criterionValues.length !== 3 ||
    !stringList(output.strengths) || !stringList(output.improvements) || !stringList(output.next_steps)
  ) throw new Error("Invalid assessment output.");
  return value as AssessmentOutput;
}
