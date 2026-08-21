import { describe, expect, it } from "vitest";
import { parseProfileInput } from "./validation";

describe("parseProfileInput", () => {
  it("normalizes a valid onboarding payload", () => {
    expect(parseProfileInput({
      displayName: "  Lan  ",
      level: "INTERMEDIATE",
      learningPurpose: "Travel",
      timezone: "Asia/Ho_Chi_Minh",
      dailyAnswerTarget: 10,
    })).toEqual({
      displayName: "Lan",
      level: "INTERMEDIATE",
      learningPurpose: "Travel",
      timezone: "Asia/Ho_Chi_Minh",
      dailyAnswerTarget: 10,
    });
  });

  it("trims the detected timezone before saving the profile", () => {
    expect(parseProfileInput({
      displayName: "Lan",
      level: "BEGINNER",
      learningPurpose: "Work",
      timezone: "  Asia/Ho_Chi_Minh  ",
      dailyAnswerTarget: 5,
    }).timezone).toBe("Asia/Ho_Chi_Minh");
  });

  it.each([0, 101, 2.5])("rejects an out-of-bounds or non-integer daily target: %s", (dailyAnswerTarget) => {
    expect(() => parseProfileInput({
      displayName: "Lan",
      level: "BEGINNER",
      learningPurpose: "Work",
      timezone: "Asia/Ho_Chi_Minh",
      dailyAnswerTarget,
    })).toThrow();
  });

  it.each([
    { displayName: "", level: "BEGINNER", learningPurpose: "Work", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 1 },
    { displayName: "Lan", level: "EXPERT", learningPurpose: "Work", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 1 },
    { displayName: "Lan", level: "BEGINNER", learningPurpose: "", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 1 },
    { displayName: "Lan", level: "BEGINNER", learningPurpose: "Work", timezone: "Not/A_Timezone", dailyAnswerTarget: 1 },
  ])("rejects an invalid profile field", (input) => {
    expect(() => parseProfileInput(input)).toThrow();
  });
});
