/**
 * Thin wrapper around the browser Web Speech API for live draft transcripts.
 * Used only as an experimental preview — grading still uses worker STT.
 */

export type BrowserSpeechHandle = {
  stop: () => Promise<string>;
  abort: () => void;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function startBrowserSpeech(lang = "en-US"): BrowserSpeechHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let finalText = "";
  let interimText = "";
  let settled = false;
  let resolveStop: ((text: string) => void) | null = null;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const chunk = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) finalText = `${finalText} ${chunk}`.trim();
      else interim += chunk;
    }
    interimText = interim.trim();
  };

  recognition.onerror = () => {
    // Keep whatever we have; stop() will resolve with final+interim.
  };

  recognition.onend = () => {
    if (settled) return;
    settled = true;
    const text = `${finalText} ${interimText}`.trim();
    resolveStop?.(text);
    resolveStop = null;
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => new Promise((resolve) => {
      if (settled) {
        resolve(`${finalText} ${interimText}`.trim());
        return;
      }
      resolveStop = resolve;
      try {
        recognition.stop();
      } catch {
        settled = true;
        resolve(`${finalText} ${interimText}`.trim());
      }
      // Safety: if onend never fires, resolve after a short wait.
      window.setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(`${finalText} ${interimText}`.trim());
        resolveStop = null;
      }, 1200);
    }),
    abort: () => {
      settled = true;
      resolveStop?.(`${finalText} ${interimText}`.trim());
      resolveStop = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    },
  };
}
