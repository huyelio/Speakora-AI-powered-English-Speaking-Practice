/** Browser side of the single TTS endpoint. Server-side OpenAI calls time out at 10s; this leaves headroom. */
export const TTS_CLIENT_TIMEOUT_MS = 15_000;
export const TTS_RETRY_LABEL = "Thử nghe lại";

export type TtsKind = "vocabulary" | "pronunciation" | "question" | "conversation";

export function ttsUrl(kind: TtsKind, sessionId: string, itemId: string): string {
  const params = new URLSearchParams({ kind, session: sessionId, item: itemId });
  return `/api/tts?${params.toString()}`;
}

/** Fetches audio into an object URL. Times out, honours an outer abort, and turns failures into retry copy. */
export async function fetchTtsObjectUrl(url: string, init: { headers?: HeadersInit; signal?: AbortSignal } = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_CLIENT_TIMEOUT_MS);
  const forward = () => controller.abort(init.signal?.reason);
  init.signal?.addEventListener("abort", forward);
  try {
    const response = await fetch(url, { headers: init.headers, signal: controller.signal });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const error = body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error : null;
      throw new Error(error ?? `Không thể phát âm thanh. Hãy bấm ${TTS_RETRY_LABEL}.`);
    }
    return URL.createObjectURL(await response.blob());
  } catch (error) {
    // Re-throw the caller's own abort untouched so it can be told apart from a timeout.
    if (init.signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error(`Âm thanh tải quá lâu. Hãy bấm ${TTS_RETRY_LABEL}.`);
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", forward);
  }
}
