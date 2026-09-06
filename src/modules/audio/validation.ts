export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Map([["audio/webm","webm"],["audio/webm;codecs=opus","webm"],["audio/mp4","mp4"],["audio/ogg","ogg"],["audio/ogg;codecs=opus","ogg"]]);
export function validateAudio(file: File) {
  if (!file.size) throw new Error("Bản ghi âm đang trống.");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("Bản ghi âm phải nhỏ hơn hoặc bằng 25 MB.");
  const extension = ALLOWED.get(file.type.toLowerCase());
  if (!extension) throw new Error("Định dạng âm thanh chưa được hỗ trợ.");
  return extension;
}
