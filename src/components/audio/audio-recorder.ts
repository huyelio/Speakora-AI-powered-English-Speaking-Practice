export type RecorderPort = { state: string; mimeType: string; start(): void; stop(): void; ondataavailable: ((event: { data: Blob }) => void) | null; onstop: (() => void) | null; onerror: (() => void) | null };
export type RecorderEnvironment = { getUserMedia(): Promise<MediaStream>; isTypeSupported(type: string): boolean; createRecorder(stream: MediaStream, mime: string): RecorderPort; createUrl(blob: Blob): string; revokeUrl(url: string): void; now(): number; uuid(): string };
export type LocalRecording = { blob: Blob; url: string; durationMs: number; idempotencyKey: string };
export type RecorderSnapshot = {
  state: "idle" | "requesting" | "recording" | "stopping" | "review";
  recording: LocalRecording | null;
  elapsedMs: number;
  error: "MIC_DENIED" | "UNSUPPORTED" | "EMPTY_RECORDING" | "RECORDING_FAILED" | null;
};
export const EMPTY_RECORDER: RecorderSnapshot = { state: "idle", recording: null, elapsedMs: 0, error: null };

/** Owns media resources independently of React so late browser callbacks are safe. */
export class AudioRecorder {
  snapshot: RecorderSnapshot = EMPTY_RECORDER;
  private epoch = 0;
  private stream: MediaStream | null = null;
  private recorder: RecorderPort | null = null;
  private startedAt = 0;
  constructor(private env: RecorderEnvironment | null, private changed: () => void) {}

  private update(patch: Partial<RecorderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.changed();
  }

  private releaseMedia() {
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  async start() {
    if (["requesting", "recording", "stopping"].includes(this.snapshot.state)) return;
    const env = this.env;
    const mime = env && ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => env.isTypeSupported(type));
    if (!env || !mime) { this.update({ error: "UNSUPPORTED" }); return; }
    const token = ++this.epoch;
    this.update({ state: "requesting", error: null });
    try {
      const media = await env.getUserMedia();
      if (token !== this.epoch) { media.getTracks().forEach((track) => track.stop()); return; }
      this.stream = media;
      const recorder = env.createRecorder(media, mime);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (token === this.epoch && event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (token !== this.epoch) return;
        this.epoch++;
        this.releaseMedia();
        this.update({ state: "idle", error: "RECORDING_FAILED" });
      };
      recorder.onstop = () => {
        if (token !== this.epoch) return;
        const durationMs = Math.max(0, env.now() - this.startedAt);
        const blob = new Blob(chunks, { type: recorder.mimeType || mime });
        this.releaseMedia();
        if (!blob.size) { this.update({ state: "idle", error: "EMPTY_RECORDING" }); return; }
        this.update({ state: "review", elapsedMs: durationMs, recording: { blob, durationMs, url: env.createUrl(blob), idempotencyKey: env.uuid() } });
      };
      recorder.start();
      if (this.snapshot.recording) env.revokeUrl(this.snapshot.recording.url);
      this.startedAt = env.now();
      this.update({ state: "recording", elapsedMs: 0, recording: null });
    } catch (reason) {
      if (token !== this.epoch) return;
      this.releaseMedia();
      this.update({ state: this.snapshot.recording ? "review" : "idle", error: reason instanceof Error && reason.name === "NotAllowedError" ? "MIC_DENIED" : "RECORDING_FAILED" });
    }
  }

  stop() {
    if (this.snapshot.state !== "recording" || !this.recorder) return;
    this.update({ state: "stopping" });
    try { this.recorder.stop(); } catch {
      this.releaseMedia();
      this.update({ state: "idle", error: "RECORDING_FAILED" });
    }
  }

  clear() {
    this.epoch++;
    this.releaseMedia();
    if (this.snapshot.recording) this.env?.revokeUrl(this.snapshot.recording.url);
    this.snapshot = EMPTY_RECORDER;
    this.changed();
  }

  tick() {
    if (this.snapshot.state !== "recording" || !this.env) return;
    this.update({ elapsedMs: this.env.now() - this.startedAt });
    if (this.snapshot.elapsedMs >= 60_000) this.stop();
  }
}
