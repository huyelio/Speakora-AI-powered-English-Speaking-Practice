import "server-only";

import { createAuthServerClient } from "../../lib/supabase/auth-server";
import type { LearnerProfile, ProfileInput } from "./types";

type ProfileRow = {
  user_id: string;
  display_name: string;
  level: LearnerProfile["level"];
  learning_purpose: string;
  timezone: string;
  onboarding_completed_at: string | null;
};

type LearningGoalRow = {
  daily_answer_target: number;
};

function toLearnerProfile(row: ProfileRow, goal: LearningGoalRow): LearnerProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    level: row.level,
    learningPurpose: row.learning_purpose,
    timezone: row.timezone,
    dailyAnswerTarget: goal.daily_answer_target,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export async function getProfile(userId: string): Promise<LearnerProfile | null> {
  const supabase = await createAuthServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, display_name, level, learning_purpose, timezone, onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw new Error("Unable to load learner profile.");
  if (!profile) return null;

  const { data: goal, error: goalError } = await supabase
    .from("learning_goals")
    .select("daily_answer_target")
    .eq("user_id", userId)
    .maybeSingle();

  if (goalError) throw new Error("Unable to load learner profile.");
  return goal ? toLearnerProfile(profile as ProfileRow, goal as LearningGoalRow) : null;
}

export async function upsertOnboarding(
  userId: string,
  input: ProfileInput,
): Promise<void> {
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("upsert_learner_onboarding", {
    p_user_id: userId,
    p_display_name: input.displayName,
    p_level: input.level,
    p_learning_purpose: input.learningPurpose,
    p_timezone: input.timezone,
    p_daily_answer_target: input.dailyAnswerTarget,
  });

  if (error) throw new Error("Unable to save learner onboarding.");
}
