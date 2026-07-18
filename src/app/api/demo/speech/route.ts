import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/audio";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function apiKey() {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured on the Next.js server.");
  }

  return key;
}

async function openAIError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || `OpenAI request failed (${response.status}).`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const { text } = (await request.json()) as { text?: unknown };

      if (typeof text !== "string" || !text.trim()) {
        return NextResponse.json({ error: "Question text is required." }, { status: 400 });
      }

      const response = await fetch(`${OPENAI_API_URL}/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "coral",
          input: text.trim(),
          instructions:
            "Speak clearly in a friendly English examiner voice at a moderate speed.",
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: await openAIError(response) }, { status: response.status });
      }

      return new NextResponse(await response.arrayBuffer(), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    if (contentType.includes("multipart/form-data")) {
      const input = await request.formData();
      const audio = input.get("audio");

      if (!(audio instanceof File) || audio.size === 0) {
        return NextResponse.json({ error: "A recorded audio file is required." }, { status: 400 });
      }

      if (audio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: "Audio must be 25 MB or smaller." }, { status: 413 });
      }

      const formData = new FormData();
      formData.append("file", audio, audio.name || "answer.webm");
      formData.append("model", "gpt-4o-mini-transcribe");
      formData.append("language", "en");
      formData.append("response_format", "json");

      const response = await fetch(`${OPENAI_API_URL}/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey()}` },
        body: formData,
      });

      if (!response.ok) {
        return NextResponse.json({ error: await openAIError(response) }, { status: response.status });
      }

      const transcription = (await response.json()) as { text?: string };
      return NextResponse.json({ text: transcription.text || "" });
    }

    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
