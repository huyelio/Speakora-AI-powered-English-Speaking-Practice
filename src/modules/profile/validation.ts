import { learnerLevels, type LearnerLevel, type ProfileInput } from "./types";

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_LEARNING_PURPOSE_LENGTH = 160;
const MIN_DAILY_ANSWER_TARGET = 1;
const MAX_DAILY_ANSWER_TARGET = 100;

export class ProfileInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileInputError";
  }
}

function readTrimmedString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new ProfileInputError(`Bạn chưa nhập ${field}.`);

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ProfileInputError(`${field} phải có từ 1 đến ${maxLength} ký tự.`);
  }

  return normalized;
}

function readLevel(value: unknown): LearnerLevel {
  if (typeof value === "string" && learnerLevels.includes(value as LearnerLevel)) {
    return value as LearnerLevel;
  }

  throw new ProfileInputError("Trình độ không hợp lệ.");
}

function readTimezone(value: unknown) {
  const timezone = readTrimmedString(value, "múi giờ", 255);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new ProfileInputError("Múi giờ không hợp lệ.");
  }

  return timezone;
}

function readDailyAnswerTarget(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_DAILY_ANSWER_TARGET ||
    value > MAX_DAILY_ANSWER_TARGET
  ) {
    throw new ProfileInputError(
      `Số câu mỗi ngày phải là số nguyên từ ${MIN_DAILY_ANSWER_TARGET} đến ${MAX_DAILY_ANSWER_TARGET}.`,
    );
  }

  return value;
}

export function parseProfileInput(value: unknown): ProfileInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProfileInputError("Thông tin hồ sơ không hợp lệ.");
  }

  const input = value as Record<string, unknown>;
  return {
    displayName: readTrimmedString(input.displayName, "tên hiển thị", MAX_DISPLAY_NAME_LENGTH),
    level: readLevel(input.level),
    learningPurpose: readTrimmedString(input.learningPurpose, "mục tiêu học", MAX_LEARNING_PURPOSE_LENGTH),
    timezone: readTimezone(input.timezone),
    dailyAnswerTarget: readDailyAnswerTarget(input.dailyAnswerTarget),
  };
}
