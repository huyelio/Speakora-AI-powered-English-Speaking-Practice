import { describe, expect, it } from "vitest";
import { parseProfileInput } from "./validation";
const input = { displayName: "  Lan  ", currentLevel: "B1", learningPurpose: "IELTS", targetScore: 6.5, dailyGoalMinutes: 10, preferredTopics: ["22222222-2222-4222-8222-222222222222"], timezone: " Asia/Ho_Chi_Minh " };
describe("parseProfileInput", () => {
  it("normalizes new fields and defaults edits to incomplete", () => {
    expect(parseProfileInput(input)).toMatchObject({ displayName: "Lan", currentLevel: "B1", level: "INTERMEDIATE", targetScore: 6.5, dailyGoalMinutes: 10, completeOnboarding: false, timezone: "Asia/Ho_Chi_Minh" });
  });
  it("allows unknown drafts but requires a check to finish", () => {
    expect(parseProfileInput({ ...input, currentLevel: null }).currentLevel).toBeNull();
    expect(() => parseProfileInput({ ...input, currentLevel: null, completeOnboarding: true })).toThrow();
    expect(parseProfileInput({ ...input, currentLevel: null, completeOnboarding: true, speakingCheckSessionId: "11111111-1111-4111-8111-111111111111" }).speakingCheckSessionId).toBe("11111111-1111-4111-8111-111111111111");
  });
  it("rejects legacy payloads that bypass unknown-level checks", () => {
    expect(() => parseProfileInput({ displayName: "Lan", level: "BEGINNER", learningPurpose: "IELTS", timezone: "UTC", dailyAnswerTarget: 5 })).toThrow();
  });
  it.each([{currentLevel:"EXPERT"},{learningPurpose:"Other"},{dailyGoalMinutes:12},{targetScore:-1},{targetScore:9.5},{targetScore:6.2},{preferredTopics:["bad"]},{timezone:"Bad/Zone"},{completeOnboarding:"true"},{speakingCheckSessionId:"bad"},{displayName:""}])("rejects invalid fields %j", invalid => {
    expect(() => parseProfileInput({...input,...invalid})).toThrow();
  });
  it("clears scores for TOEIC and all other non-IELTS goals", () => {
    expect(parseProfileInput({...input,learningPurpose:"TOEIC",targetScore:850}).targetScore).toBeNull();
    expect(parseProfileInput({...input,learningPurpose:"Du lịch",targetScore:6.5}).targetScore).toBeNull();
  });
  it.each([0, 4, 4.5])("rejects IELTS targets below 5.0: %s", targetScore => {
    expect(() => parseProfileInput({...input,targetScore})).toThrow();
  });
  it.each([5, 5.5, 9])("accepts supported IELTS target %s", targetScore => {
    expect(parseProfileInput({...input,targetScore}).targetScore).toBe(targetScore);
  });
  it("requires a selected topic", () => {
    expect(() => parseProfileInput({...input,preferredTopics:[]})).toThrow();
  });
  it.each([null, undefined])("requires an IELTS target %s", targetScore => {
    expect(() => parseProfileInput({...input,targetScore})).toThrow();
  });
});
