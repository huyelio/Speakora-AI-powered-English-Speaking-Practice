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

export type RecorderOperation = "start" | "stop" | "submit";

export type RecorderOperationToken = {
  operation: RecorderOperation;
  generation: number;
};

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

export class RecorderOperationGate {
  private generation = 0;
  private readonly active = new Set<RecorderOperation>();

  begin(operation: RecorderOperation): RecorderOperationToken | null {
    if (this.active.size > 0) return null;
    this.active.add(operation);
    return { operation, generation: this.generation };
  }

  isCurrent(token: RecorderOperationToken): boolean {
    return token.generation === this.generation && this.active.has(token.operation);
  }

  finish(token: RecorderOperationToken): boolean {
    if (!this.isCurrent(token)) return false;
    this.active.delete(token.operation);
    return true;
  }

  cancelAll(): void {
    this.generation += 1;
    this.active.clear();
  }
}

export function stopMediaStream(
  media: { getTracks(): Array<{ stop(): void }> } | null,
): void {
  media?.getTracks().forEach((track) => track.stop());
}
