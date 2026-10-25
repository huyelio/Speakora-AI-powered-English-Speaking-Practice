import { describe, expect, it, vi } from "vitest";
import { transcribeTurn, replyToTurn, type ConversationStore } from "./service";
import { airplaneScenario, type ConversationSession } from "./scenario";

const session: ConversationSession = { scenario: airplaneScenario, id: "s", status: "IN_PROGRESS", user_turn_count: 1, completed_goals: ["destination_reason"], pending_message_id: "m", processing_until: null, messages: [
  { id: "opening", role: "assistant", content: "Where are you going?", turn_index: 0, processing_status: "COMPLETED", completed_goals: [] },
  { id: "m", role: "user", content: "I look forward to visiting a temple.", turn_index: 1, processing_status: "TRANSCRIBED", completed_goals: [] },
] };
function store(overrides: Partial<ConversationStore> = {}): ConversationStore {
  return { load: vi.fn(async () => session), claim: vi.fn(async () => ({ ...session.messages[1], audio_path: "private/audio.webm" })), advance: vi.fn(async () => {}), upload: vi.fn(async () => "private/new.webm"), download: vi.fn(async () => new Blob(["audio"])), ...overrides };
}
describe("persisted conversation turns", () => {
  it("reuses a saved transcript without uploading or transcribing again", async () => {
    const db = store(); const transcribe = vi.fn(async () => "duplicate");
    await transcribeTurn(db, { transcribe }, "u", "s", "m", {});
    expect(transcribe).not.toHaveBeenCalled();
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("downloads saved audio after refresh and persists transcript before generation", async () => {
    const db = store({ claim: vi.fn(async () => ({ ...session.messages[1], content: "", processing_status: "PENDING" as const, audio_path: "private/audio.webm" })) });
    const result = await transcribeTurn(db, { transcribe: async () => "I'm going to Japan for a holiday." }, "u", "s", "m", {});
    expect(db.download).toHaveBeenCalledWith("private/audio.webm");
    expect(db.advance).toHaveBeenCalledWith("u", "s", expect.any(String), "TRANSCRIPT", { content: "I'm going to Japan for a holiday." });
    expect(result.id).toBe("s");
  });
  it("uses prior dialogue and preserves goals when generating a reply", async () => {
    const db = store(); const reply = vi.fn(async () => ({ reply: "That sounds lovely!", completedGoals: [] }));
    await replyToTurn(db, { reply }, "u", "s", "m");
    expect(reply).toHaveBeenCalledWith([{ role: "assistant", content: "Where are you going?" }, { role: "user", content: "I look forward to visiting a temple." }], ["destination_reason"], airplaneScenario);
    expect(db.advance).toHaveBeenCalledWith("u", "s", expect.any(String), "REPLY", { content: "That sounds lovely!", goals: ["destination_reason"] });
  });
  it("releases processing on provider error so the stored turn can be retried", async () => {
    const db = store();
    await expect(replyToTurn(db, { reply: async () => { throw new Error("offline"); } }, "u", "s", "m")).rejects.toThrow("offline");
    expect(db.advance).toHaveBeenCalledWith("u", "s", expect.any(String), "RELEASE");
  });
  it("does not call AI again for a completed idempotent turn", async () => {
    const db = store({ claim: vi.fn(async () => ({ ...session.messages[1], processing_status: "COMPLETED" as const, audio_path: null })) });
    const reply = vi.fn();
    await replyToTurn(db, { reply }, "u", "s", "m");
    expect(reply).not.toHaveBeenCalled();
  });
  it("rejects empty transcription and keeps the turn retryable", async () => {
    const db = store({ claim: vi.fn(async () => ({ ...session.messages[1], content: "", processing_status: "PENDING" as const, audio_path: "private/audio.webm" })) });
    await expect(transcribeTurn(db, { transcribe: async () => " " }, "u", "s", "m", {})).rejects.toThrow("Không nhận diện");
    expect(db.advance).toHaveBeenCalledWith("u", "s", expect.any(String), "RELEASE");
  });
  it("replaces failed saved audio only when a new recording is explicitly supplied", async () => {
    const db = store({ claim: vi.fn(async () => ({ ...session.messages[1], content: "", processing_status: "PENDING" as const, audio_path: "private/old.webm" })) });
    const file = new File(["new recording"], "answer.webm", { type: "audio/webm" });
    await transcribeTurn(db, { transcribe: async () => "I'm visiting a friend." }, "u", "s", "m", { audio: file, replaceAudio: true });
    expect(db.upload).toHaveBeenCalledWith("u", "s", "m", expect.any(String), file);
    expect(db.download).toHaveBeenCalledWith("private/new.webm");
  });
});
