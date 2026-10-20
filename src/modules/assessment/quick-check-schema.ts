export const quickCheckCefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type QuickCheckCefr = (typeof quickCheckCefrLevels)[number];
export type QuickCheckOutput = {
  estimated_cefr: QuickCheckCefr;
  feedback: string;
  recommendation: string;
};

export const quickCheckJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    estimated_cefr: { type: "string", enum: quickCheckCefrLevels },
    feedback: { type: "string", minLength: 1, maxLength: 500 },
    recommendation: { type: "string", minLength: 1, maxLength: 500 },
  },
  required: ["estimated_cefr", "feedback", "recommendation"],
} as const;

export function parseQuickCheckOutput(value: unknown): QuickCheckOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Quick Check output.");
  }
  const result = value as Record<string, unknown>;
  const keys = Object.keys(result);
  if (keys.length !== 3 || keys.some((key) => !quickCheckJsonSchema.required.includes(key as typeof quickCheckJsonSchema.required[number]))
    || !quickCheckCefrLevels.includes(result.estimated_cefr as QuickCheckCefr)
    || [result.feedback, result.recommendation].some((text) => typeof text !== "string" || !text.trim() || text.length > 500)) {
    throw new Error("Invalid Quick Check output.");
  }
  return result as QuickCheckOutput;
}
