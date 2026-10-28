import { describe, expect, it, vi } from "vitest";
import { assessConversation, transcribeTurn, replyToTurn, type ConversationStore } from "./service";
import { airplaneScenario, type ConversationSession } from "./scenario";

const session: ConversationSession = { scenario: airplaneScenario, assessment: null, reward_xp: 0, id: "s", status: "IN_PROGRESS", user_turn_count: 1, completed_goals: ["destination_reason"], pending_message_id: "m", processing_until: null, messages: [
  { id: "opening", role: "assistant", content: "Where are you going?", turn_index: 0, processing_status: "COMPLETED", completed_goals: [] },
  { id: "m", role: "user", content: "I look forward to visiting a temple.", turn_index: 1, processing_status: "TRANSCRIBED", completed_goals: [] },
] };
function store(overrides: Partial<ConversationStore> = {}): ConversationStore {
  return { load: vi.fn(async () => session), claim: vi.fn(async () => ({ ...session.messages[1], audio_path: "private/audio.webm" })), advance: vi.fn(async () => {}), upload: vi.fn(async () => "private/new.webm"), download: vi.fn(async () => new Blob(["audio"])), saveAssessment: vi.fn(async () => {}), ...overrides };
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
    const transcribe = vi.fn(async () => "I'm visiting a friend.");
    await transcribeTurn(db, { transcribe }, "u", "s", "m", { audio: file, replaceAudio: true });
    expect(db.upload).toHaveBeenCalledWith("u", "s", "m", expect.any(String), file);
    // The just-uploaded file is transcribed directly, without a Storage round trip.
    expect(db.download).not.toHaveBeenCalled();
    expect(transcribe).toHaveBeenCalledWith(file, "new.webm");
  });
});

describe("role-play assessment", () => {
  const ended: ConversationSession = { ...session, status: "COMPLETED", user_turn_count: 3, pending_message_id: null, messages: [
    { id: "a0", role: "assistant", content: "Where are you going?", turn_index: 0, processing_status: "COMPLETED", completed_goals: [] },
    { id: "u1", role: "user", content: "I going to Japan.", turn_index: 1, processing_status: "COMPLETED", completed_goals: [] },
    { id: "u2", role: "user", content: "For holiday.", turn_index: 2, processing_status: "COMPLETED", completed_goals: [] },
    { id: "u3", role: "user", content: "What about you?", turn_index: 3, processing_status: "COMPLETED", completed_goals: [] },
  ] };
  const criterion = { level: "FAIR", summary: "Ổn.", example: null };
  const output = (original: string) => ({
    overall_feedback: "Bạn trò chuyện tự nhiên.",
    criteria: { fluency_coherence: criterion, lexical_resource: criterion, grammatical_range_accuracy: { ...criterion, example: { original, corrected: "I'm going to Japan." } }, interaction: criterion },
    rewrites: [], useful_phrases: ["I'm off to ___."],
  });

  it.each([
    ["still running", { status: "IN_PROGRESS" as const }],
    ["too short", { user_turn_count: 2 }],
    ["already assessed", { assessment: output("I going to Japan.") as never }],
  ])("does not call the model when the session is %s", async (_, change) => {
    const db = store({ load: vi.fn(async () => ({ ...ended, ...change })) }); const assess = vi.fn();
    await assessConversation(db, { assess }, "u", "s");
    expect(assess).not.toHaveBeenCalled();
    expect(db.saveAssessment).not.toHaveBeenCalled();
  });
  it("judges only the transcript and saves validated feedback", async () => {
    const db = store({ load: vi.fn(async () => ended) }); const assess = vi.fn(async () => output("i  going to JAPAN."));
    await assessConversation(db, { assess }, "u", "s");
    expect(assess).toHaveBeenCalledWith(ended.messages.map(({ role, content }) => ({ role, content })), airplaneScenario);
    expect(db.saveAssessment).toHaveBeenCalledWith("u", "s", expect.objectContaining({ overall_feedback: "Bạn trò chuyện tự nhiên." }));
  });
  it("retries once when a quote is not from the learner, then gives up", async () => {
    const db = store({ load: vi.fn(async () => ended) });
    const assess = vi.fn().mockResolvedValueOnce(output("Where are you going?")).mockResolvedValueOnce(output("I going to Japan."));
    await assessConversation(db, { assess }, "u", "s");
    expect(assess).toHaveBeenCalledTimes(2);
    expect(db.saveAssessment).toHaveBeenCalledTimes(1);
    const failing = store({ load: vi.fn(async () => ended) });
    await expect(assessConversation(failing, { assess: async () => output("invented") }, "u", "s")).rejects.toThrow("not found");
    expect(failing.saveAssessment).not.toHaveBeenCalled();
  });
});
