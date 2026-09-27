"use client";

import { useEffect, useRef, useState } from "react";
import { AudioRecorder, EMPTY_RECORDER, type RecorderEnvironment, type RecorderPort } from "./audio-recorder";

export function useAudioRecorder() {
  const [snapshot, setSnapshot] = useState(EMPTY_RECORDER);
  const capture = useRef<AudioRecorder | null>(null);
  useEffect(() => {
    let mounted = true;
    const env: RecorderEnvironment | null = typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia ? {
      getUserMedia: () => navigator.mediaDevices.getUserMedia({ audio: true }),
      isTypeSupported: (mime) => MediaRecorder.isTypeSupported(mime),
      createRecorder: (stream, mimeType) => new MediaRecorder(stream, { mimeType }) as unknown as RecorderPort,
      createUrl: (blob) => URL.createObjectURL(blob), revokeUrl: (url) => URL.revokeObjectURL(url),
      now: () => Date.now(), uuid: () => crypto.randomUUID(),
    } : null;
    const recorder = new AudioRecorder(env, () => { if (mounted) setSnapshot(recorder.snapshot); });
    capture.current = recorder;
    const timer = window.setInterval(() => recorder.tick(), 250);
    return () => { mounted = false; window.clearInterval(timer); recorder.clear(); capture.current = null; };
  }, []);
  return { ...snapshot, start: () => capture.current?.start(), stop: () => capture.current?.stop(), clear: () => capture.current?.clear() };
}
