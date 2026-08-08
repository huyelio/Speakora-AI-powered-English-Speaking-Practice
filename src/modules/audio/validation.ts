export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Map([["audio/webm","webm"],["audio/webm;codecs=opus","webm"],["audio/mp4","mp4"],["audio/ogg","ogg"],["audio/ogg;codecs=opus","ogg"]]);
export function validateAudio(file: File) {
  if (!file.size) throw new Error("Audio file is empty.");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("Audio must be 25 MB or smaller.");
  const extension = ALLOWED.get(file.type.toLowerCase());
  if (!extension) throw new Error("Unsupported audio format.");
  return extension;
}
