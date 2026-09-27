export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Map([["audio/webm","webm"],["audio/webm;codecs=opus","webm"],["audio/mp4","mp4"],["audio/ogg","ogg"],["audio/ogg;codecs=opus","ogg"]]);
export type AudioValidationPolicy = {
  maxBytes?: number;
  maxSizeLabel?: string;
};

export function validateAudio(file: File, policy: AudioValidationPolicy = {}) {
  const maxBytes = policy.maxBytes ?? MAX_AUDIO_BYTES;
  const maxSizeLabel = policy.maxSizeLabel ?? "25 MB";
  if (!file.size) throw new Error("Bản ghi âm đang trống.");
  if (file.size > maxBytes) throw new Error(`Bản ghi âm phải nhỏ hơn hoặc bằng ${maxSizeLabel}.`);
  const extension = ALLOWED.get(file.type.toLowerCase());
  if (!extension) throw new Error("Định dạng âm thanh chưa được hỗ trợ.");
  return extension;
}
