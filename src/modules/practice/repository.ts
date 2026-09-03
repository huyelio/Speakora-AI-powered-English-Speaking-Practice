import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { authorizeSessionRecord, type SessionPrincipal } from "./auth";
import type { AuthorizedSession, ClientPracticeSession, CriterionFeedback, GeneralResultExperience, PracticeMode, PracticeResult, SessionQuestion, SessionStatus } from "./types";
import { selectIeltsSessionQuestions, type IeltsQuestionCandidate } from "../questions/ielts-selection";
import { selectGeneralQuestions } from "../questions/general-selection";
import { getGeneralQuestionCandidates } from "../topics/repository";
import type { LearnerLevel } from "../profile/types";
import { mapReviewRows } from "./review";
import { learnerLocalDate, levelFromXp } from "../progress/rules";
import { getAvailableTopics } from "../topics/repository";
import { rankTopicRecommendations } from "../recommendations/rank";

type RpcRow = { session_id: string; session_question_id: string; sequence_no: number; prompt_snapshot: Record<string, unknown> };
type SessionRow = {
  id: string;
  status: string;
  mode: PracticeMode;
  user_id: string | null;
  guest_token_hash: string | null;
  question_count: number;
  topic_id: string | null;
  difficulty_level: string | null;
};

type AssessmentRow = {
  estimated_band: number | null;
  overall_feedback: string;
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  raw_output: Record<string, unknown>;
};

export type RegisteredAnswer = {
  id: string;
  status: string;
  idempotencyKey: string;
  storagePath: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
};

export type PracticeAnswerRegistration = {
  answerId: string;
  sessionId: string;
  sessionQuestionId: string;
  storagePath: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  idempotencyKey: string;
};

export async function createPracticeSession(tokenHash: string) {
  const db = getSupabaseAdminClient();
  const { data: candidates, error: candidateError } = await db.from("questions").select("id,code,group_id,topic_id,question_types!inner(code),practice_modes!inner(code,is_active)").eq("status","ACTIVE").eq("practice_modes.code","IELTS").eq("practice_modes.is_active",true).in("question_types.code",["IELTS_PART_1","IELTS_PART_2_CUE_CARD","IELTS_PART_3"]);
  if(candidateError) throw candidateError;
  const selected=selectIeltsSessionQuestions((candidates||[]).map((row:any):IeltsQuestionCandidate=>({id:row.id,code:row.code,groupId:row.group_id,topicId:row.topic_id,questionType:(Array.isArray(row.question_types)?row.question_types[0]:row.question_types).code})));
  const { data, error } = await db.rpc("create_ielts_practice_session", { p_token_hash: tokenHash, p_question_ids:selected.map(question=>question.id) });
  if (error) throw error;
  const rows = data as RpcRow[];
  if (!rows?.length) throw new Error("Unable to create practice session.");
  return { sessionId: rows[0].session_id, questions: rows.map(mapQuestion) };
}

export async function createGeneralPracticeSession(
  userId: string,
  topicId: string,
  difficulty: LearnerLevel,
) {
  const { candidates, recentQuestionIds } = await getGeneralQuestionCandidates(userId, topicId, difficulty);
  const selected = selectGeneralQuestions(candidates, recentQuestionIds);
  const { data, error } = await getSupabaseAdminClient().rpc("create_general_practice_session", {
    p_user_id: userId,
    p_topic_id: topicId,
    p_difficulty: difficulty,
    p_question_ids: selected.map((question) => question.id),
  });
  if (error) throw error;

  const rows = data as RpcRow[];
  if (!rows?.length) throw new Error("Unable to create General practice session.");
  const questions = rows.map(mapQuestion);
  const topic = questions[0]?.topic;
  if (!topic) throw new Error("General practice session is missing its topic snapshot.");
  return { sessionId: rows[0].session_id, topic, questions };
}

function mapQuestion(row: RpcRow): SessionQuestion {
  const p = row.prompt_snapshot as any;
  return { sessionQuestionId: row.session_question_id, sequenceNo: row.sequence_no, id: p.id, code: p.code,
    promptText: p.prompt_text, instructionText: p.instruction_text, prepSeconds: p.prep_seconds,
    answerSeconds: p.answer_seconds, questionType: p.question_type, topic: p.topic,
    promptItems: (p.prompt_items || []).map((i: any) => ({ content: i.content, sequenceNo: i.sequence_no })) };
}

export async function authorizeSession(
  sessionId: string,
  principal: SessionPrincipal,
): Promise<AuthorizedSession | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("practice_sessions")
    .select("id,status,mode,user_id,guest_token_hash,question_count,topic_id,difficulty_level")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  const session = data as SessionRow | null;
  if (!session || !authorizeSessionRecord(session, principal)) return null;
  return {
    id: session.id,
    status: session.status,
    mode: session.mode,
    userId: session.user_id,
    guestTokenHash: session.guest_token_hash,
    questionCount: session.question_count,
    topicId: session.topic_id,
    difficulty: session.difficulty_level,
  };
}

export async function getClientPracticeSession(
  session: AuthorizedSession,
): Promise<ClientPracticeSession> {
  const { data, error } = await getSupabaseAdminClient()
    .from("session_questions")
    .select("id,sequence_no,prompt_snapshot,user_answers(id)")
    .eq("session_id", session.id)
    .order("sequence_no");
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    sequence_no: number;
    prompt_snapshot: Record<string, unknown>;
    user_answers: unknown[] | null;
  }>;
  const questions = rows.map((row) => mapQuestion({
    session_id: session.id,
    session_question_id: row.id,
    sequence_no: row.sequence_no,
    prompt_snapshot: row.prompt_snapshot,
  }));
  const submitted = rows.filter((row) => Array.isArray(row.user_answers) && row.user_answers.length > 0).length;
  return {
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    questions,
    currentQuestionIndex: Math.min(submitted, questions.length),
    topic: questions[0]?.topic ?? null,
  };
}

export async function questionBelongsToSession(sessionId: string, sessionQuestionId: string) {
  const { data, error } = await getSupabaseAdminClient().from("session_questions").select("id,sequence_no,prompt_snapshot").eq("id",sessionQuestionId).eq("session_id",sessionId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const db=getSupabaseAdminClient();
  const [{data:session,error:se},{data:questions,error:qe},{data:assessment},{data:job}] = await Promise.all([
    db.from("practice_sessions").select("id,status,question_count").eq("id",sessionId).single(),
    db.from("session_questions").select("id,sequence_no,user_answers(status)").eq("session_id",sessionId).order("sequence_no"),
    db.from("session_assessments").select("id").eq("session_id",sessionId).maybeSingle(),
    db.from("processing_jobs").select("status").eq("session_id",sessionId).eq("job_type","ASSESSMENT").maybeSingle(),
  ]);
  if(se) throw se; if(qe) throw qe;
  const answers=(questions||[]).map((q:any)=>{const answer=Array.isArray(q.user_answers)?q.user_answers[0]:q.user_answers;return {sessionQuestionId:q.id,sequenceNo:q.sequence_no,status:answer?.status||"PENDING"};});
  const completed=answers.filter(a=>a.status==="TRANSCRIBED").length, failed=answers.filter(a=>a.status==="FAILED").length;
  const assessmentStatus = assessment ? "COMPLETED" : (job?.status || "WAITING") as SessionStatus["assessmentStatus"];
  return {sessionId,status:session.status,completed,failed,total:session.question_count,assessmentStatus,answers};
}

export async function getAssessment(sessionId:string, mode: PracticeMode):Promise<PracticeResult|null>{
  const {data,error}=await getSupabaseAdminClient().from("session_assessments").select("estimated_band,overall_feedback,strengths,improvements,next_steps,raw_output").eq("session_id",sessionId).maybeSingle();
  if(error) throw error; if(!data) return null;
  return mapAssessmentRow(mode, data as AssessmentRow);
}

export function mapAssessmentRow(mode: PracticeMode, data: AssessmentRow): PracticeResult {
  const raw = data.raw_output as Record<string, any>;
  const criteria = raw.criteria;
  const shared = {
    overallFeedback: data.overall_feedback,
    strengths: data.strengths,
    improvements: data.improvements,
    nextSteps: data.next_steps,
    criteria: criteria ? {
      fluencyCoherence: mapCriterion(criteria.fluency_coherence),
      lexicalResource: mapCriterion(criteria.lexical_resource),
      grammaticalRangeAccuracy: mapCriterion(criteria.grammatical_range_accuracy),
    } : null,
  };
  if (mode === "IELTS") {
    return { mode, estimatedBand: Number(data.estimated_band), ...shared };
  }
  return {
    mode,
    ...shared,
    usefulPhrase: String(raw.useful_phrase),
    recommendationTags: Array.isArray(raw.recommendation_tags)
      ? raw.recommendation_tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

export async function getGeneralResultExperience(
  session: AuthorizedSession,
  result: Extract<PracticeResult, { mode: "GENERAL" }>,
): Promise<GeneralResultExperience | null> {
  if (!session.userId || session.mode !== "GENERAL") return null;
  const db = getSupabaseAdminClient();
  const [profileResult, goalResult, streakResult, allXpResult, sessionXpResult, topics] = await Promise.all([
    db.from("profiles").select("level,timezone").eq("user_id", session.userId).maybeSingle(),
    db.from("learning_goals").select("daily_answer_target").eq("user_id", session.userId).maybeSingle(),
    db.from("user_streaks").select("current_streak,longest_streak").eq("user_id", session.userId).maybeSingle(),
    db.from("xp_events").select("amount").eq("user_id", session.userId),
    db.from("xp_events").select("amount").eq("user_id", session.userId).eq("session_id", session.id),
    getAvailableTopics(session.userId),
  ]);
  if (profileResult.error || goalResult.error || streakResult.error || allXpResult.error || sessionXpResult.error) {
    throw new Error("Unable to load General result progress.");
  }
  const profile = profileResult.data;
  const goal = goalResult.data;
  if (!profile || !goal) throw new Error("Learner progress is unavailable.");
  const localDate = learnerLocalDate(new Date(), profile.timezone);
  const { data: daily, error: dailyError } = await db
    .from("daily_progress")
    .select("completed_answers,goal_achieved_at")
    .eq("user_id", session.userId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (dailyError) throw new Error("Unable to load daily progress.");

  const totalXp = (allXpResult.data ?? []).reduce((sum, event) => sum + Number(event.amount), 0);
  const sessionXp = (sessionXpResult.data ?? []).reduce((sum, event) => sum + Number(event.amount), 0);
  const currentTopic = topics.find((topic) => topic.id === session.topicId);
  const recommendations = rankTopicRecommendations(
    { level: profile.level as LearnerLevel },
    topics.map((topic) => ({
      slug: topic.slug,
      levels: topic.levels.map((item) => item.level),
      lastPracticedAt: topic.lastPracticedAt,
    })),
    currentTopic ? [{ topicSlug: currentTopic.slug, completedAt: new Date().toISOString() }] : [],
    result.recommendationTags,
  );
  const recommendation = recommendations[0];
  const nextTopic = recommendation
    ? topics.find((topic) => topic.slug === recommendation.topicSlug)
    : undefined;

  return {
    rewards: { sessionXp, totalXp, level: levelFromXp(totalXp) },
    dailyGoal: {
      completed: Number(daily?.completed_answers ?? 0),
      target: Number(goal.daily_answer_target),
      achieved: daily?.goal_achieved_at != null,
    },
    streak: {
      current: Number(streakResult.data?.current_streak ?? 0),
      longest: Number(streakResult.data?.longest_streak ?? 0),
    },
    nextTopic: recommendation && nextTopic ? {
      slug: recommendation.topicSlug,
      name: nextTopic.name,
      level: recommendation.level,
      reason: recommendation.reason,
    } : null,
  };
}

function mapCriterion(value:unknown):CriterionFeedback{
  if(typeof value==="string")return {summary:value,example:null};
  const item=value as any;return {summary:item.summary,example:item.example||null};
}

export async function getAnswerReview(sessionId:string){
  const {data,error}=await getSupabaseAdminClient().from("session_questions").select("id,sequence_no,prompt_snapshot,user_answers!inner(id,transcripts!inner(text))").eq("session_id",sessionId).order("sequence_no");
  if(error) throw error; return mapReviewRows(sessionId,data||[]);
}

export async function findAnswerAudio(sessionId:string,answerId:string){
  const {data,error}=await getSupabaseAdminClient().from("user_answers").select("id,storage_bucket,storage_path,mime_type,session_questions!inner(session_id)").eq("id",answerId).eq("session_questions.session_id",sessionId).maybeSingle();
  if(error) throw error; if(!data) return null;
  return {answerId:data.id,bucket:data.storage_bucket,path:data.storage_path,mimeType:data.mime_type};
}

export async function findRegisteredAnswer(sessionQuestionId: string): Promise<RegisteredAnswer | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("user_answers")
    .select("id,status,idempotency_key,storage_path,mime_type,duration_ms,size_bytes")
    .eq("session_question_id", sessionQuestionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    idempotencyKey: data.idempotency_key,
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    durationMs: data.duration_ms,
    sizeBytes: data.size_bytes,
  };
}

export async function registerPracticeAnswer(input: PracticeAnswerRegistration) {
  const { data, error } = await getSupabaseAdminClient().rpc("register_practice_answer", {
    p_answer_id: input.answerId,
    p_session_id: input.sessionId,
    p_session_question_id: input.sessionQuestionId,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_duration_ms: input.durationMs,
    p_size_bytes: input.sizeBytes,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Unable to register practice answer.");
  return {
    answerId: row.answer_id as string,
    status: row.answer_status as string,
    sequenceNo: row.sequence_no as number,
  };
}

export async function recordAnswerProgress(answerId: string): Promise<void> {
  const { error } = await getSupabaseAdminClient().rpc("record_answer_progress", {
    p_answer_id: answerId,
  });
  if (error) throw error;
}
