import {
  cefrLevels,
  dailyGoalMinutes,
  learningGoals,
  type CefrLevel,
  type LearnerLevel,
  type OnboardingInput,
} from "./types";

export class ProfileInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileInputError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new ProfileInputError(`${field} phải có từ 1 đến ${maxLength} ký tự.`);
  }
  return value.trim();
}

export function legacyLevel(level: CefrLevel | null): LearnerLevel {
  if (level === "C1" || level === "C2") return "ADVANCED";
  if (level === "B1" || level === "B2") return "INTERMEDIATE";
  return "BEGINNER";
}

export function parseProfileInput(value: unknown): OnboardingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProfileInputError("Thông tin hồ sơ không hợp lệ.");
  }
  const input = value as Record<string, unknown>;
  if (input.currentLevel !== null && !cefrLevels.includes(input.currentLevel as CefrLevel)) {
    throw new ProfileInputError("Trình độ không hợp lệ.");
  }
  const currentLevel = input.currentLevel as CefrLevel | null;
  const learningPurpose = readString(input.learningPurpose, "Mục tiêu học", 160);
  if (!(learningGoals as readonly string[]).includes(learningPurpose)) {
    throw new ProfileInputError("Mục tiêu học không hợp lệ.");
  }
  if (!(dailyGoalMinutes as readonly unknown[]).includes(input.dailyGoalMinutes)) {
    throw new ProfileInputError("Thời gian học không hợp lệ.");
  }
  if (
    !Array.isArray(input.preferredTopics) || input.preferredTopics.length === 0 || input.preferredTopics.length > 100 ||
    input.preferredTopics.some(id => typeof id !== "string" || !uuid.test(id))
  ) {
    throw new ProfileInputError("Chủ đề không hợp lệ.");
  }
  if (input.completeOnboarding !== undefined && typeof input.completeOnboarding !== "boolean") {
    throw new ProfileInputError("Trạng thái hồ sơ không hợp lệ.");
  }
  if (
    input.speakingCheckSessionId !== undefined &&
    (typeof input.speakingCheckSessionId !== "string" || !uuid.test(input.speakingCheckSessionId))
  ) {
    throw new ProfileInputError("Bài kiểm tra không hợp lệ.");
  }
  const completeOnboarding = input.completeOnboarding === true;
  if (completeOnboarding && currentLevel === null && !input.speakingCheckSessionId) {
    throw new ProfileInputError("Hãy hoàn thành bài kiểm tra nói để xác định trình độ.");
  }
  const timezone = readString(input.timezone, "Múi giờ", 255);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new ProfileInputError("Múi giờ không hợp lệ.");
  }

  let targetScore: number | null = null;
  if (learningPurpose === "IELTS") {
    const score = input.targetScore;
    if (
      typeof score !== "number" || !Number.isFinite(score) ||
      score < 5 || score > 9 || !Number.isInteger(score * 2)
    ) {
      throw new ProfileInputError("Điểm mục tiêu IELTS phải từ 5.0 đến 9.0.");
    }
    targetScore = score;
  }

  return {
    displayName: readString(input.displayName, "Tên hiển thị", 80),
    currentLevel,
    level: legacyLevel(currentLevel),
    learningPurpose,
    timezone,
    dailyAnswerTarget: 5,
    targetScore,
    dailyGoalMinutes: input.dailyGoalMinutes as number,
    preferredTopics: [...new Set(input.preferredTopics as string[])],
    completeOnboarding,
    ...(input.speakingCheckSessionId
      ? { speakingCheckSessionId: input.speakingCheckSessionId as string }
      : {}),
  };
}
