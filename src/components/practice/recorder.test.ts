import { expect, it } from "vitest";
import { recorderTransition, revokePendingRecording } from "./recorder";

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
