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
  if (typeof value !== "string") throw new ProfileInputError(`${field} is required.`);

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ProfileInputError(`${field} must be between 1 and ${maxLength} characters.`);
  }

  return normalized;
}

function readLevel(value: unknown): LearnerLevel {
  if (typeof value === "string" && learnerLevels.includes(value as LearnerLevel)) {
    return value as LearnerLevel;
  }

  throw new ProfileInputError("A valid level is required.");
}

function readTimezone(value: unknown) {
  const timezone = readTrimmedString(value, "Timezone", 255);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new ProfileInputError("A valid IANA timezone is required.");
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
      `Daily answer target must be an integer between ${MIN_DAILY_ANSWER_TARGET} and ${MAX_DAILY_ANSWER_TARGET}.`,
    );
  }

  return value;
}

export function parseProfileInput(value: unknown): ProfileInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProfileInputError("Profile input must be an object.");
  }

  const input = value as Record<string, unknown>;
  return {
    displayName: readTrimmedString(input.displayName, "Display name", MAX_DISPLAY_NAME_LENGTH),
    level: readLevel(input.level),
    learningPurpose: readTrimmedString(input.learningPurpose, "Learning purpose", MAX_LEARNING_PURPOSE_LENGTH),
    timezone: readTimezone(input.timezone),
    dailyAnswerTarget: readDailyAnswerTarget(input.dailyAnswerTarget),
  };
}
