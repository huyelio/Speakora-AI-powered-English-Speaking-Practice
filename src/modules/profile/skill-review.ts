import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { getAssessment } from "../practice/repository";
import type { PracticeResult } from "../practice/types";

export type SkillReview = {
  sessionId: string;
  completedAt: string;
  result: Extract<PracticeResult, { mode: "GENERAL" }>;
};

export async function getLatestSkillReview(userId: string): Promise<SkillReview | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("practice_sessions")
    .select("id,completed_at")
    .eq("user_id", userId)
    .eq("mode", "GENERAL")
    .eq("status", "COMPLETED")
    .or("session_kind.is.null,session_kind.neq.QUICK_CHECK")
    .order("completed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to load skill review.");
  if (!data) return null;
  const result = await getAssessment(data.id, "GENERAL");
  return result?.mode === "GENERAL"
    ? { sessionId: data.id, completedAt: data.completed_at, result }
    : null;
}
