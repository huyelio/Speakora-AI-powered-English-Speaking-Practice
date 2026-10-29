import type { ConversationMessage } from "../../modules/conversation/scenario";

/** How long a fresh AI line may wait for its voice before the text shows anyway. */
export const AUTO_VOICE_REVEAL_MS = 4_000;
export const AUTO_VOICE_STORAGE_KEY = "speakora.roleplay.autoVoice";

/** The assistant line that `after` adds to `before`: the one to voice automatically. */
export function freshAssistantLine(before: readonly ConversationMessage[], after: readonly ConversationMessage[]): string | null {
  const seen = new Set(before.map((message) => message.id));
  return [...after].reverse().find((message) => message.role === "assistant" && message.content && !seen.has(message.id))?.id ?? null;
}

/** Messenger grouping: a speaker's avatar sits on the last bubble of each run. */
export function showsAvatar(roles: readonly ConversationMessage["role"][], index: number): boolean {
  return roles[index + 1] !== roles[index];
}

/**
 * A short silent clip. Playing it inside a tap "unlocks" the shared audio element,
 * so Safari lets the same element auto-play the AI reply a few seconds later.
 */
export const SILENT_WAV = (() => {
  const samples = 80;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i); };
  text(0, "RIFF"); view.setUint32(4, 36 + samples, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, "data"); view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
})();
