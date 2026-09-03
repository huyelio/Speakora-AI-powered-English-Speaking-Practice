import { expect, it } from "vitest";
import {
  RecorderOperationGate,
  recorderTransition,
  revokePendingRecording,
  stopMediaStream,
} from "./recorder";

it("requires review before upload", () => {
  expect(recorderTransition("recording", "STOP")).toBe("review");
  expect(recorderTransition("review", "RERECORD")).toBe("recording");
  expect(recorderTransition("review", "SUBMIT")).toBe("uploading");
});

it("rejects invalid transitions", () => {
  expect(() => recorderTransition("idle", "SUBMIT")).toThrow(
    "Invalid recorder transition",
  );
});

it("keeps failed uploads reviewable and makes submitted answers final", () => {
  expect(recorderTransition("idle", "START")).toBe("recording");
  expect(recorderTransition("uploading", "UPLOAD_FAILED")).toBe("review");
  expect(recorderTransition("uploading", "UPLOAD_SUCCEEDED")).toBe("submitted");
  expect(() => recorderTransition("submitted", "RERECORD")).toThrow(
    "Invalid recorder transition",
  );
});

it("revokes playback when a pending recording is discarded", async () => {
  const recording = {
    blob: new Blob(["audio"]),
    durationMs: 1000,
    idempotencyKey: "answer-key",
    url: URL.createObjectURL(new Blob(["audio"])),
  };

  await expect(fetch(recording.url)).resolves.toBeInstanceOf(Response);
  revokePendingRecording(recording);
  await expect(fetch(recording.url)).rejects.toThrow();
});

it("admits only one start, stop, or submit operation until it finishes", () => {
  for (const operation of ["start", "stop", "submit"] as const) {
    const gate = new RecorderOperationGate();
    const token = gate.begin(operation);

    expect(token).not.toBeNull();
    expect(gate.begin(operation)).toBeNull();
    if (operation === "start") expect(gate.begin("submit")).toBeNull();
    expect(gate.finish(token!)).toBe(true);
    expect(gate.begin(operation)).not.toBeNull();
  }
});

it("invalidates async recorder work when the current attempt is canceled", () => {
  const gate = new RecorderOperationGate();
  const start = gate.begin("start")!;

  gate.cancelAll();

  expect(gate.finish(start)).toBe(false);
  expect(gate.begin("start")).not.toBeNull();
});

it("stops every track on a locally acquired stream", () => {
  const stopped: string[] = [];
  const media = {
    getTracks: () => [
      { stop: () => stopped.push("microphone") },
      { stop: () => stopped.push("secondary") },
    ],
  };

  stopMediaStream(media);

  expect(stopped).toEqual(["microphone", "secondary"]);
});
