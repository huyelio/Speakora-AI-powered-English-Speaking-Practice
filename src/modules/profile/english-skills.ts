import "server-only";

import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { getAssessment } from "../practice/repository";
import type { PracticeMode, PracticeResult } from "../practice/types";

export type EnglishSkillKey = "listening" | "speaking" | "reading" | "writing";

export type EnglishSkill =
  | {
      key: EnglishSkillKey;
      label: string;
      status: "NOT_ASSESSED";
    }
  | {
      key: EnglishSkillKey;
      label: string;
      status: "ASSESSED";
      value: string;
      scale: "CEFR" | "IELTS band estimate";
      source: "Quick Speaking Check" | "IELTS Speaking";
      assessedAt: string;
      sessionId: string;
    };

type AssessedSkill = Extract<EnglishSkill, { status: "ASSESSED" }>;

type AssessmentSessionRow = {
  id: string;
  mode: PracticeMode;
  session_kind: "QUICK_CHECK" | null;
  completed_at: string;
};

const skillCatalog: ReadonlyArray<{ key: EnglishSkillKey; label: string }> = [
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
];

export function unassessedEnglishSkills(): EnglishSkill[] {
  return skillCatalog.map(({ key, label }) => ({ key, label, status: "NOT_ASSESSED" }));
}

function speakingResult(session: AssessmentSessionRow, result: PracticeResult): AssessedSkill | null {
  if (result.mode === "IELTS") {
    return {
      key: "speaking",
      label: "Speaking",
      status: "ASSESSED",
      value: result.estimatedBand.toFixed(1),
      scale: "IELTS band estimate",
      source: "IELTS Speaking",
      assessedAt: session.completed_at,
      sessionId: session.id,
    };
  }
  if (result.quickCheck) {
    return {
      key: "speaking",
      label: "Speaking",
      status: "ASSESSED",
      value: result.quickCheck.estimatedCefr,
      scale: "CEFR",
      source: "Quick Speaking Check",
      assessedAt: session.completed_at,
      sessionId: session.id,
    };
  }
  return null;
}

export async function getEnglishSkills(userId: string): Promise<EnglishSkill[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("practice_sessions")
    .select("id,mode,session_kind,completed_at")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .or("mode.eq.IELTS,session_kind.eq.QUICK_CHECK")
    .order("completed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Unable to load English skills.");
  if (!data) return unassessedEnglishSkills();

  const session = data as AssessmentSessionRow;
  if ((session.mode !== "IELTS" && session.mode !== "GENERAL") || !session.completed_at) {
    throw new Error("Unable to load English skills.");
  }

  try {
    const sessionKind = session.session_kind === "QUICK_CHECK" ? "QUICK_CHECK" : undefined;
    const result = await getAssessment(session.id, session.mode, sessionKind);
    const speaking = result ? speakingResult(session, result) : null;
    return unassessedEnglishSkills().map((skill) => skill.key === "speaking" && speaking ? speaking : skill);
  } catch {
    throw new Error("Unable to load English skills.");
  }
}
