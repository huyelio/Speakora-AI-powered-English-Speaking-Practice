const BASE = "https://api.openai.com/v1";
function key() {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new Error("OPENAI_API_KEY is not configured.");
  return value;
}
async function fail(response: Response) {
  const body = await response.json().catch(() => null);
  throw new Error(
    body?.error?.message || `OpenAI request failed (${response.status}).`,
  );
}

export interface TextToSpeechProvider {
  synthesize(text: string): Promise<ArrayBuffer>;
}
export interface SpeechToTextProvider {
  transcribe(file: Blob, name: string): Promise<string>;
}
export interface AssessmentProvider {
  assess(input: string): Promise<Record<string, unknown>>;
}

export class OpenAIProvider
  implements TextToSpeechProvider, SpeechToTextProvider, AssessmentProvider
{
  async synthesize(text: string) {
    const r = await fetch(`${BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "coral",
        input: text,
        instructions:
          "Speak clearly in a friendly English IELTS examiner voice at a moderate speed.",
        response_format: "mp3",
      }),
    });
    if (!r.ok) await fail(r);
    return r.arrayBuffer();
  }
  async transcribe(file: Blob, name: string) {
    const form = new FormData();
    form.append("file", file, name);
    form.append(
      "model",
      process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
    );
    form.append("language", "en");
    form.append("response_format", "json");
    const r = await fetch(`${BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}` },
      body: form,
    });
    if (!r.ok) await fail(r);
    return ((await r.json()) as { text?: string }).text?.trim() || "";
  }
  async assess(input: string) {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        estimated_band: {
          type: "number",
          minimum: 0,
          maximum: 9,
          multipleOf: 0.5,
        },
        overall_feedback: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        improvements: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
      required: [
        "estimated_band",
        "overall_feedback",
        "strengths",
        "improvements",
        "next_steps",
      ],
    };
    const r = await fetch(`${BASE}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSESSMENT_MODEL || "gpt-4o-mini",
        instructions:
          "You are an IELTS Speaking coach. Estimate performance only from transcripts. Do not claim to assess pronunciation. Give concise, actionable feedback. Trả lời bằng tiếng việt",
        input,
        text: {
          format: {
            type: "json_schema",
            name: "ielts_speaking_assessment",
            strict: true,
            schema,
          },
        },
      }),
    });
    if (!r.ok) await fail(r);
    const body = (await r.json()) as any;
    const output =
      body.output_text ||
      body.output
        ?.flatMap((x: any) => x.content || [])
        .find((x: any) => x.type === "output_text")?.text;
    if (!output) throw new Error("Assessment response contained no output.");
    return JSON.parse(output);
  }
}
