import { assessmentJsonSchema } from "../assessment/schema";
import { generalAssessmentJsonSchema } from "../assessment/general-schema";
import type { PracticeMode } from "../practice/types";

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
  synthesize(text: string, options?: SynthesizeOptions): Promise<ArrayBuffer>;
}
export interface SpeechToTextProvider {
  transcribe(file: Blob, name: string): Promise<string>;
}
export interface AssessmentProvider {
  assess(input: string, mode: PracticeMode): Promise<Record<string, unknown>>;
}

export type SynthesizeOptions = {
  instructions?: string;
  voice?: string;
  speed?: number;
};

export const SPEAKING_TTS_INSTRUCTIONS =
  "Speak clearly in a friendly English IELTS examiner voice at a moderate speed.";

export const VOCABULARY_TTS_INSTRUCTIONS =
  "You are a clear English dictionary voice for vocabulary learners. Pronounce only the given word. Enunciate every syllable distinctly, project with confident full volume (never soft, breathy, or whispered), keep a natural but slightly slow pace, and leave a clean ending. Do not add extra words, spelling, or explanation.";

export class OpenAIProvider
  implements TextToSpeechProvider, SpeechToTextProvider, AssessmentProvider
{
  async synthesize(text: string, options: SynthesizeOptions = {}) {
    const speed = options.speed ?? Number(process.env.OPENAI_TTS_SPEED || "1");
    const body: Record<string, unknown> = {
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: options.voice || process.env.OPENAI_TTS_VOICE || "coral",
      input: text,
      instructions: options.instructions || SPEAKING_TTS_INSTRUCTIONS,
      response_format: "mp3",
    };
    if (Number.isFinite(speed) && speed > 0 && speed !== 1) {
      body.speed = Math.min(4, Math.max(0.25, speed));
    }

    const r = await fetch(`${BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
  async assess(input: string, mode: PracticeMode) {
    const format = mode === "GENERAL"
      ? {
          name: "general_speaking_assessment",
          schema: generalAssessmentJsonSchema,
          instructions:
            "You are a General English speaking coach. Evaluate communicative clarity, transcript-supported fluency and coherence, lexical resource and naturalness, and grammatical range and accuracy. Return all feedback in Vietnamese except the useful English phrase. For each criterion, write one short, specific summary. Include at most one example; use null when no useful example exists. The example.original text must be copied verbatim from an Answer transcript, never invented or paraphrased. Add example.corrected only when a correction or stronger alternative is genuinely useful; otherwise use null. Keep each card compact. You must not return an exam band or imply an IELTS score. Never assess, score, or comment on pronunciation because you are not analyzing audio.",
        }
      : {
          name: "ielts_speaking_assessment",
          schema: assessmentJsonSchema,
          instructions:
            "You are an IELTS Speaking coach. Estimate performance only from transcripts and return all feedback in Vietnamese. For each criterion, write one short, specific summary. Include at most one example; use null when no useful example exists. The example.original text must be copied verbatim from an Answer transcript, never invented or paraphrased. Add example.corrected only when a correction or stronger alternative is genuinely useful; otherwise use null. Keep each card compact. Never assess, score, or comment on pronunciation because you are not analyzing audio.",
        };
    const r = await fetch(`${BASE}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSESSMENT_MODEL || "gpt-4o-mini",
        instructions: format.instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: format.name,
            strict: true,
            schema: format.schema,
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
