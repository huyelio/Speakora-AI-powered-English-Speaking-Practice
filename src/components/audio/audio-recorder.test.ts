import { describe, expect, it, vi } from "vitest";
import { AudioRecorder, type RecorderEnvironment, type RecorderPort } from "./audio-recorder";

function setup() {
  const stopTrack = vi.fn();
  const media = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  const recorder: RecorderPort = { state: "inactive", mimeType: "audio/mp4", ondataavailable: null, onstop: null, onerror: null,
    start() { this.state = "recording"; }, stop() { this.state = "inactive"; } };
  const urls = new Set<string>();
  let time = 0;
  const env: RecorderEnvironment = { getUserMedia: async () => media, isTypeSupported: (type) => type === "audio/mp4", createRecorder: (_stream, mime) => { recorder.mimeType = mime; return recorder; },
    createUrl: () => { urls.add("blob:audio"); return "blob:audio"; }, revokeUrl: (url) => { urls.delete(url); }, now: () => time, uuid: () => "key" };
  const capture = new AudioRecorder(env, () => {});
  return { capture, env, recorder, media, stopTrack, urls, advance: (value: number) => { time = value; capture.tick(); } };
}

describe("audio capture lifecycle", () => {
  it("chooses supported MP4, collects final chunks, measures duration and releases the microphone", async () => {
    const context = setup();
    await context.capture.start();
    expect(context.capture.snapshot.state).toBe("recording");
    context.advance(1500);
    expect(context.capture.snapshot.elapsedMs).toBe(1500);
    context.capture.stop();
    context.recorder.ondataavailable?.({ data: new Blob(["audio"]) });
    context.recorder.onstop?.();
    expect(context.capture.snapshot.recording).toMatchObject({ durationMs: 1500, idempotencyKey: "key", url: "blob:audio" });
    expect(context.capture.snapshot.recording?.blob.type).toBe("audio/mp4");
    expect(context.stopTrack).toHaveBeenCalled();
    context.capture.clear();
    expect(context.urls.size).toBe(0);
  });
  it("cancels a pending microphone request and closes the late stream", async () => {
    const context = setup();
    let resolve!: (stream: MediaStream) => void;
    context.env.getUserMedia = () => new Promise((done) => { resolve = done; });
    const start = context.capture.start();
    context.capture.clear();
    resolve(context.media);
    await start;
    expect(context.capture.snapshot.state).toBe("idle");
    expect(context.stopTrack).toHaveBeenCalled();
  });
  it("reports denied permission and unsupported types without opening a recorder", async () => {
    const context = setup();
    context.env.getUserMedia = async () => { throw new DOMException("denied", "NotAllowedError"); };
    await context.capture.start();
    expect(context.capture.snapshot.error).toBe("MIC_DENIED");
    context.env.isTypeSupported = () => false;
    await context.capture.start();
    expect(context.capture.snapshot.error).toBe("UNSUPPORTED");
  });
  it("rejects empty audio and ignores late stop events after cleanup", async () => {
    const context = setup();
    await context.capture.start();
    context.capture.stop();
    context.recorder.onstop?.();
    expect(context.capture.snapshot.recording).toBeNull();
    expect(context.capture.snapshot.error).toBe("EMPTY_RECORDING");
    await context.capture.start();
    const lateStop = context.recorder.onstop;
    context.capture.clear();
    lateStop?.();
    expect(context.capture.snapshot.recording).toBeNull();
    expect(context.urls.size).toBe(0);
  });
  it("does not request a second microphone while already starting or recording", async () => {
    const context = setup();
    const acquire = vi.spyOn(context.env, "getUserMedia");
    await Promise.all([context.capture.start(), context.capture.start()]);
    await context.capture.start();
    expect(acquire).toHaveBeenCalledTimes(1);
  });
});
