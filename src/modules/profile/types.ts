export const learnerLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export type LearnerLevel = (typeof learnerLevels)[number];

export type ProfileInput = {
  displayName: string;
  level: LearnerLevel;
  learningPurpose: string;
  timezone: string;
  dailyAnswerTarget: number;
};

export type LearnerProfile = ProfileInput & {
  userId: string;
  onboardingCompletedAt: string | null;
};
