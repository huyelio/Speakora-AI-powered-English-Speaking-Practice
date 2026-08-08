export class AudioAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type AudioRecord = { answerId: string; bucket: string; path: string; mimeType: string };
type Dependencies = {
  authorizeSession: (sessionId: string, token: string) => Promise<unknown>;
  findAnswerAudio: (sessionId: string, answerId: string) => Promise<AudioRecord | null>;
};

export async function resolveAuthorizedAudio(
  request: { sessionId: string; answerId: string; token: string },
  dependencies: Dependencies,
): Promise<AudioRecord> {
  const authorized = request.token && await dependencies.authorizeSession(request.sessionId, request.token);
  if (!authorized) throw new AudioAccessError(404, "Audio not found.");
  const audio = await dependencies.findAnswerAudio(request.sessionId, request.answerId);
  if (!audio) throw new AudioAccessError(404, "Audio not found.");
  return audio;
}
