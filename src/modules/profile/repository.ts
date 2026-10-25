import "server-only";

import { cache } from "react";
import { createAuthServerClient } from "../../lib/supabase/auth-server";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { cefrLevels, type CefrLevel, type LearnerProfile, type OnboardingInput } from "./types";
import { ProfileInputError } from "./validation";

type ProfileRow = {
  user_id: string;
  display_name: string;
  level: LearnerProfile["level"];
  learning_purpose: string;
  learning_purposes?: string[];
  timezone: string;
  onboarding_completed_at: string | null;
  current_level: CefrLevel | null;
  level_source: LearnerProfile["levelSource"];
  target_score: number | null;
  preferred_topics: string[];
};

type LearningGoalRow = {
  daily_answer_target: number;
  daily_goal_minutes: number;
};

function toLearnerProfile(row: ProfileRow, goal: LearningGoalRow): LearnerProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    level: row.level,
    learningPurpose: row.learning_purpose,
    learningPurposes: row.learning_purposes ?? [row.learning_purpose],
    timezone: row.timezone,
    dailyAnswerTarget: goal.daily_answer_target,
    onboardingCompletedAt: row.onboarding_completed_at,
    currentLevel: row.current_level ?? null,
    levelSource: row.level_source ?? null,
    targetScore: row.target_score ?? null,
    preferredTopics: row.preferred_topics ?? [],
    dailyGoalMinutes: goal.daily_goal_minutes ?? 10,
  };
}

/** Request-scoped dedupe when layout and page both load the learner profile. */
export const getProfile = cache(async (userId: string): Promise<LearnerProfile | null> => {
  const supabase = await createAuthServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, display_name, level, learning_purpose, learning_purposes, timezone, onboarding_completed_at, current_level, level_source, target_score, preferred_topics")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw new Error("Unable to load learner profile.");
  if (!profile) return null;

  const { data: goal, error: goalError } = await supabase
    .from("learning_goals")
    .select("daily_answer_target, daily_goal_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (goalError) throw new Error("Unable to load learner profile.");
  return goal ? toLearnerProfile(profile as ProfileRow, goal as LearningGoalRow) : null;
});

export async function upsertOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<void> {
  const currentLevel = input.speakingCheckSessionId
    ? await getCheckedLevel(userId, input.speakingCheckSessionId)
    : input.currentLevel;
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("upsert_learner_onboarding", {
    p_user_id: userId,
    p_display_name: input.displayName,
    p_current_level: currentLevel,
    p_learning_purpose: input.learningPurpose,
    p_learning_purposes: input.learningPurposes ?? [input.learningPurpose],
    p_timezone: input.timezone,
    p_target_score: input.targetScore,
    p_daily_goal_minutes: input.dailyGoalMinutes,
    p_preferred_topics: input.preferredTopics,
    p_complete_onboarding: input.completeOnboarding,
    p_speaking_check_session_id: input.speakingCheckSessionId ?? null,
  });

  if (error) throw new Error("Unable to save learner onboarding.");
}

async function getCheckedLevel(userId: string, sessionId: string): Promise<CefrLevel> {
  const db = getSupabaseAdminClient();
  const { data: session, error } = await db.from("practice_sessions")
    .select("id,user_id,status,session_kind,question_count,session_questions(user_answers(status))")
    .eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Unable to load speaking check.");
  const questions = session?.session_questions;
  if (!session || session.user_id !== userId || session.status !== "COMPLETED" ||
    session.session_kind !== "QUICK_CHECK" || session.question_count !== 3 ||
    !Array.isArray(questions) || questions.length !== 3 ||
    questions.some(question => {
      const answers = question.user_answers as { status: string } | { status: string }[] | null;
      return Array.isArray(answers)
        ? answers.length !== 1 || answers[0].status !== "TRANSCRIBED"
        : answers?.status !== "TRANSCRIBED";
    })) {
    throw new ProfileInputError("Hãy hoàn thành bài kiểm tra nói của bạn trước khi tiếp tục.");
  }
  const { data: assessment, error: assessmentError } = await db.from("session_assessments")
    .select("raw_output").eq("session_id", sessionId).maybeSingle();
  if (assessmentError) throw new Error("Unable to load speaking check result.");
  const result = assessment?.raw_output;
  if (!result || typeof result !== "object" || !cefrLevels.includes(result.estimated_cefr) ||
    typeof result.feedback !== "string" || !result.feedback.trim() ||
    typeof result.recommendation !== "string" || !result.recommendation.trim()) {
    throw new ProfileInputError("Kết quả kiểm tra nói chưa sẵn sàng.");
  }
  return result.estimated_cefr as CefrLevel;
}

export async function resetOnboarding(userId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("Onboarding reset is unavailable.");
  const { error } = await getSupabaseAdminClient().from("profiles")
    .update({ onboarding_completed_at: null }).eq("user_id", userId);
  if (error) throw new Error("Unable to reset onboarding.");
}
