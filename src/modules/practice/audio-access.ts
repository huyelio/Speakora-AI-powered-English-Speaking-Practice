import type { SessionPrincipal } from "./auth";

export class AudioAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type AudioRecord = { answerId: string; bucket: string; path: string; mimeType: string };
type Dependencies = {
  authorizeSession: (sessionId: string, principal: SessionPrincipal) => Promise<unknown>;
  findAnswerAudio: (sessionId: string, answerId: string) => Promise<AudioRecord | null>;
};

export async function resolveAuthorizedAudio(
  request: { sessionId: string; answerId: string; principal: SessionPrincipal },
  dependencies: Dependencies,
): Promise<AudioRecord> {
  const authorized = await dependencies.authorizeSession(request.sessionId, request.principal);
  if (!authorized) throw new AudioAccessError(404, "Không tìm thấy bản ghi âm.");
  const audio = await dependencies.findAnswerAudio(request.sessionId, request.answerId);
  if (!audio) throw new AudioAccessError(404, "Không tìm thấy bản ghi âm.");
  return audio;
}
