import { VOCABULARY_TTS_INSTRUCTIONS, type SynthesizeOptions } from "../ai-gateway/openai";

/** Text plus every option that changes the audio. Equal requests share one cache object. */
export type SpeechRequest = { text: string; options: SynthesizeOptions };

/** One vocabulary word. Vocabulary, pronunciation and V2 sessions all read words this way. */
export function wordSpeech(word: string): SpeechRequest {
  return {
    text: `${word.trim()}.`,
    options: {
      instructions: VOCABULARY_TTS_INSTRUCTIONS,
      speed: Number(process.env.OPENAI_VOCAB_TTS_SPEED || "0.9"),
      voice: process.env.OPENAI_VOCAB_TTS_VOICE || process.env.OPENAI_TTS_VOICE || "coral",
    },
  };
}

/** A question prompt from the bank (topic practice, IELTS, Quick Speaking Check). */
export function questionSpeech(prompt: string): SpeechRequest {
  return { text: prompt, options: {} };
}

/** A role-play line spoken in the scenario's AI role. */
export function rolePlaySpeech(text: string, aiRole: string): SpeechRequest {
  return {
    text,
    options: { instructions: `Your role: ${aiRole} Speak clear natural English at moderate speed. Read only the supplied text.` },
  };
}
