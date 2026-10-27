import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { speechRequestBody, type SynthesizeOptions } from "../ai-gateway/openai";
import type { SpeechRequest } from "./voices";

/**
 * Shared cache for fixed bank content only. Callers must never pass per-learner or AI-generated
 * text: every learner who asks for the same request is served the same object.
 * No `server-only` import, so the prebuild script can share the exact key logic.
 */
export const TTS_CACHE_BUCKET = "tts-cache";

/** Object path from a SHA-256 of model, voice, speed, instructions, format and text. */
export function ttsCachePath(request: SpeechRequest): string {
  const body = speechRequestBody(request.text, request.options);
  const key = createHash("sha256")
    .update(JSON.stringify([body.model, body.voice, body.speed ?? 1, body.instructions, body.response_format, body.input]))
    .digest("hex");
  return `v1/${key.slice(0, 2)}/${key}.mp3`;
}

export type TtsCacheStorage = {
  /** Cached bytes, or null on a miss. */
  download(path: string): Promise<ArrayBuffer | null>;
  upload(path: string, audio: ArrayBuffer): Promise<void>;
};

export function supabaseTtsStorage(db: SupabaseClient): TtsCacheStorage {
  const bucket = () => db.storage.from(TTS_CACHE_BUCKET);
  return {
    async download(path) {
      const { data, error } = await bucket().download(path);
      return error || !data ? null : data.arrayBuffer();
    },
    async upload(path, audio) {
      // upsert:false: a concurrent writer of the same key already stored identical-purpose audio.
      const { error } = await bucket().upload(path, audio, { contentType: "audio/mpeg", upsert: false });
      if (error && !/exists|duplicate/i.test(error.message)) throw error;
    },
  };
}

export type Synthesize = (text: string, options: SynthesizeOptions) => Promise<ArrayBuffer>;

/** Serves from Storage, or synthesizes and stores. A cache read or write failure never fails the request. */
export async function cachedSpeech(storage: TtsCacheStorage, synthesize: Synthesize, request: SpeechRequest) {
  const path = ttsCachePath(request);
  const cached = await storage.download(path).catch(() => null);
  if (cached) return { audio: cached, hit: true };
  const audio = await synthesize(request.text, request.options);
  await storage.upload(path, audio).catch(() => undefined);
  return { audio, hit: false };
}
