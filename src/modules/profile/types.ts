export const learnerLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type LearnerLevel = (typeof learnerLevels)[number];
export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof cefrLevels)[number];
export const learningGoals = ["IELTS", "TOEIC", "Giao tiếp", "Công việc", "Du lịch", "Phỏng vấn", "Học tập", "Du học và định cư", "Thuyết trình, nói trước đám đông", "Kết bạn và giao lưu quốc tế", "Phát triển bản thân"] as const;
export const dailyGoalMinutes = [5, 10, 15, 20, 30] as const;
export const cefrOptions: { value: CefrLevel; label: string; description: string }[] = [
  { value: "A1", label: "Mới bắt đầu", description: "Hiểu và dùng một số từ, câu rất đơn giản." },
  { value: "A2", label: "Cơ bản", description: "Giao tiếp ngắn về những chủ đề quen thuộc." },
  { value: "B1", label: "Trung cấp", description: "Diễn đạt ý kiến và kể về trải nghiệm hằng ngày." },
  { value: "B2", label: "Khá", description: "Trao đổi khá tự nhiên và giải thích quan điểm." },
  { value: "C1", label: "Nâng cao", description: "Diễn đạt linh hoạt, rõ ràng về chủ đề phức tạp." },
  { value: "C2", label: "Thành thạo", description: "Sử dụng tiếng Anh chính xác và tự nhiên." },
];
export type ProfileInput = {
  displayName: string;
  level: LearnerLevel;
  learningPurpose: string;
  learningPurposes?: string[];
  timezone: string;
  dailyAnswerTarget: number;
  currentLevel?: CefrLevel | null;
  levelSource?: "SELF_REPORTED" | "QUICK_CHECK" | null;
  targetScore?: number | null;
  preferredTopics?: string[];
  dailyGoalMinutes?: number;
};
export type OnboardingInput = ProfileInput & {
  currentLevel: CefrLevel | null;
  targetScore: number | null;
  preferredTopics: string[];
  dailyGoalMinutes: number;
  completeOnboarding: boolean;
  speakingCheckSessionId?: string;
};
export type LearnerProfile = ProfileInput & {
  userId: string;
  onboardingCompletedAt: string | null;
};
