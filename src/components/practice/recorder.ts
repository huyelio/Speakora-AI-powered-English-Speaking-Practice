export type RecorderState =
  | "idle"
  | "recording"
  | "review"
  | "uploading"
  | "submitted";

export type RecorderEvent =
  | "START"
  | "STOP"
  | "RERECORD"
  | "SUBMIT"
  | "UPLOAD_FAILED"
  | "UPLOAD_SUCCEEDED";

const transitions: Record<
  RecorderState,
  Partial<Record<RecorderEvent, RecorderState>>
> = {
  idle: { START: "recording" },
  recording: { STOP: "review" },
  review: { RERECORD: "recording", SUBMIT: "uploading" },
  uploading: { UPLOAD_FAILED: "review", UPLOAD_SUCCEEDED: "submitted" },
  submitted: {},
};

export function recorderTransition(
  state: RecorderState,
  event: RecorderEvent,
): RecorderState {
  const next = transitions[state][event];
  if (!next) {
    throw new Error(`Invalid recorder transition: ${state} -> ${event}`);
  }
  return next;
}

export function revokePendingRecording(recording: { url: string } | null): void {
  if (recording) URL.revokeObjectURL(recording.url);
}
