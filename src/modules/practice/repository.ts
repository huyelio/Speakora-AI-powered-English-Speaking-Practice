import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { authorizeSessionRecord, type SessionPrincipal } from "./auth";
import type { AuthorizedSession, ClientPracticeSession, CriterionFeedback, GeneralResultExperience, PracticeMode, PracticeResult, SessionQuestion, SessionStatus } from "./types";
import { selectIeltsSessionQuestions, type IeltsQuestionCandidate } from "../questions/ielts-selection";
import { selectGeneralQuestions } from "../questions/general-selection";
import { getGeneralQuestionCandidates } from "../topics/repository";
import { DEFAULT_PRACTICE_QUESTION_COUNT } from "./constants";
import type { LearnerLevel } from "../profile/types";
import { mapReviewRows } from "./review";
import { effectiveCurrentStreak, learnerLocalDate, levelFromXp } from "../progress/rules";
import { getAvailableTopics } from "../topics/repository";
import { rankTopicRecommendations, recommendationTagsForTopic } from "../recommendations/rank";
import { parseAssessmentOutput } from "../assessment/schema";
import {
  generalRecommendationTags,
  parseGeneralAssessmentOutput,
} from "../assessment/general-schema";
import type { TopicSummary } from "../topics/types";

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
  assessment_mode: unknown;
  estimated_band: unknown;
  overall_feedback: unknown;
  strengths: unknown;
  improvements: unknown;
  next_steps: unknown;
  raw_output: unknown;
};

type ClientSessionQuestionRow = {
  id: string;
  sequence_no: number;
  prompt_snapshot: Record<string, unknown>;
  user_answers: unknown[] | Record<string, unknown> | null;
};

type RecentAssessmentRow = { raw_output: unknown };

export class InsufficientTopicQuestionsError extends Error {
  constructor(topicId: string, requested: number, available: number) {
    super(`Chủ đề này chỉ có ${available} câu hỏi khả dụng; cần ${requested} câu.`);
    this.name = "InsufficientTopicQuestionsError";
    void topicId;
  }
}

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
  questionCount: number = DEFAULT_PRACTICE_QUESTION_COUNT,
) {
  const { candidates, recentQuestionIds } = await getGeneralQuestionCandidates(userId, topicId);
  let selected;
  try {
    selected = selectGeneralQuestions(candidates, recentQuestionIds, questionCount);
  } catch {
    throw new InsufficientTopicQuestionsError(topicId, questionCount, candidates.length);
  }
  const { data, error } = await getSupabaseAdminClient().rpc("create_general_practice_session", {
    p_user_id: userId,
    p_topic_id: topicId,
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
  return mapClientPracticeSession(session, (data ?? []) as ClientSessionQuestionRow[]);
}

export function mapClientPracticeSession(
  session: AuthorizedSession,
  data: readonly ClientSessionQuestionRow[],
): ClientPracticeSession {
  const rows = [...data].sort((left, right) => left.sequence_no - right.sequence_no);
  const questions = rows.map((row) => mapQuestion({
    session_id: session.id,
    session_question_id: row.id,
    sequence_no: row.sequence_no,
    prompt_snapshot: row.prompt_snapshot,
  }));
  const firstUnanswered = rows.findIndex((row) => (
    row.user_answers === null
    || (Array.isArray(row.user_answers) && row.user_answers.length === 0)
  ));
  return {
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    questions,
    currentQuestionIndex: firstUnanswered === -1 ? questions.length : firstUnanswered,
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
  const {data,error}=await getSupabaseAdminClient().from("session_assessments").select("assessment_mode,estimated_band,overall_feedback,strengths,improvements,next_steps,raw_output").eq("session_id",sessionId).maybeSingle();
  if(error) throw error; if(!data) return null;
  return mapAssessmentRow(mode, data as AssessmentRow);
}

export function mapAssessmentRow(mode: PracticeMode, data: AssessmentRow): PracticeResult {
  if (data.assessment_mode !== mode) {
    throw new Error("Assessment mode does not match session mode.");
  }
  if (mode === "IELTS") {
    const parsed = parseAssessmentOutput(data.raw_output);
    assertStoredAssessmentColumns(data, parsed);
    if (data.estimated_band !== parsed.estimated_band) {
      throw new Error("Stored IELTS assessment does not match validated output.");
    }
    return {
      mode,
      estimatedBand: parsed.estimated_band,
      overallFeedback: parsed.overall_feedback,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      nextSteps: parsed.next_steps,
      criteria: mapCriteria(parsed.criteria),
    };
  }
  const parsed = parseGeneralAssessmentOutput(data.raw_output);
  assertStoredAssessmentColumns(data, parsed);
  if (data.estimated_band !== null) {
    throw new Error("Stored General assessment unexpectedly contains an IELTS band.");
  }
  return {
    mode,
    overallFeedback: parsed.overall_feedback,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    nextSteps: parsed.next_steps,
    criteria: mapCriteria(parsed.criteria),
    usefulPhrase: parsed.useful_phrase,
    recommendationTags: parsed.recommendation_tags,
  };
}

function assertStoredAssessmentColumns(
  data: AssessmentRow,
  parsed: {
    overall_feedback: string;
    strengths: string[];
    improvements: string[];
    next_steps: string[];
  },
): void {
  if (
    data.overall_feedback !== parsed.overall_feedback
    || !sameStringList(data.strengths, parsed.strengths)
    || !sameStringList(data.improvements, parsed.improvements)
    || !sameStringList(data.next_steps, parsed.next_steps)
  ) {
    throw new Error("Stored assessment columns do not match validated output.");
  }
}

function sameStringList(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => item === expected[index]);
}

function mapCriteria(criteria: {
  fluency_coherence: CriterionFeedback;
  lexical_resource: CriterionFeedback;
  grammatical_range_accuracy: CriterionFeedback;
}) {
  return {
    fluencyCoherence: mapCriterion(criteria.fluency_coherence),
    lexicalResource: mapCriterion(criteria.lexical_resource),
    grammaticalRangeAccuracy: mapCriterion(criteria.grammatical_range_accuracy),
  };
}

export function collectRecentRecommendationTags(
  rows: readonly RecentAssessmentRow[],
): string[] {
  if (rows.length < 2) return [];
  const allowed = new Set<string>(generalRecommendationTags);
  const tagsFor = (row: RecentAssessmentRow): string[] => {
    if (!row.raw_output || typeof row.raw_output !== "object") return [];
    const value = (row.raw_output as Record<string, unknown>).recommendation_tags;
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === "string" && allowed.has(tag))
      : [];
  };
  const newest = [...new Set(tagsFor(rows[0]))];
  const previous = new Set(tagsFor(rows[1]));
  return newest.filter((tag) => previous.has(tag));
}

type GeneralResultExperienceInput = {
  session: AuthorizedSession;
  now: Date;
  profile: { level: LearnerLevel; timezone: string };
  goal: { daily_answer_target: number };
  daily: { completed_answers: number; daily_answer_target?: number | null; goal_achieved_at: string | null } | null;
  streak: {
    current_streak: number;
    longest_streak: number;
    last_goal_achieved_date: string | null;
  } | null;
  totalXp: number;
  sessionXp: Array<{ amount: number }>;
  topics: TopicSummary[];
  recentAssessments: RecentAssessmentRow[];
};

export function mapGeneralResultExperience(
  input: GeneralResultExperienceInput,
): GeneralResultExperience {
  const localDate = learnerLocalDate(input.now, input.profile.timezone);
  const totalXp = input.totalXp;
  const sessionXp = input.sessionXp.reduce((sum, event) => sum + Number(event.amount), 0);
  const currentTopic = input.topics.find((topic) => topic.id === input.session.topicId);
  const recommendations = rankTopicRecommendations(
    { level: input.profile.level },
    input.topics.map((topic) => ({
      slug: topic.slug,
      levels: topic.levels.map((item) => item.level),
      lastPracticedAt: topic.lastPracticedAt,
      tags: recommendationTagsForTopic(topic.slug),
    })),
    currentTopic ? [{ topicSlug: currentTopic.slug, completedAt: input.now.toISOString() }] : [],
    collectRecentRecommendationTags(input.recentAssessments),
  );
  const recommendation = recommendations[0];
  const nextTopic = recommendation
    ? input.topics.find((topic) => topic.slug === recommendation.topicSlug)
    : undefined;
  const storedStreak = input.streak ?? {
    current_streak: 0,
    longest_streak: 0,
    last_goal_achieved_date: null,
  };

  return {
    rewards: { sessionXp, totalXp, level: levelFromXp(totalXp) },
    dailyGoal: {
      completed: Number(input.daily?.completed_answers ?? 0),
      target: Number(input.daily?.daily_answer_target ?? input.goal.daily_answer_target),
      achieved: input.daily?.goal_achieved_at != null,
    },
    streak: {
      current: effectiveCurrentStreak({
        current: Number(storedStreak.current_streak),
        longest: Number(storedStreak.longest_streak),
        lastAchievedDate: storedStreak.last_goal_achieved_date,
      }, localDate),
      longest: Number(storedStreak.longest_streak),
    },
    nextTopic: recommendation && nextTopic ? {
      slug: recommendation.topicSlug,
      name: nextTopic.name,
      level: recommendation.level,
      reason: recommendation.reason,
    } : null,
  };
}

export async function getGeneralResultExperience(
  session: AuthorizedSession,
  _result: Extract<PracticeResult, { mode: "GENERAL" }>,
): Promise<GeneralResultExperience | null> {
  if (!session.userId || session.mode !== "GENERAL") return null;
  const db = getSupabaseAdminClient();
  const [profileResult, goalResult, streakResult, totalXpResult, sessionXpResult, recentAssessmentsResult, topics] = await Promise.all([
    db.from("profiles").select("level,timezone").eq("user_id", session.userId).maybeSingle(),
    db.from("learning_goals").select("daily_answer_target").eq("user_id", session.userId).maybeSingle(),
    db.from("user_streaks").select("current_streak,longest_streak,last_goal_achieved_date").eq("user_id", session.userId).maybeSingle(),
    db.rpc("get_learner_xp_total", { p_user_id: session.userId }),
    db.from("xp_events").select("amount").eq("user_id", session.userId).eq("session_id", session.id),
    db.from("session_assessments")
      .select("raw_output,created_at,practice_sessions!inner(user_id,status)")
      .eq("assessment_mode", "GENERAL")
      .eq("practice_sessions.user_id", session.userId)
      .eq("practice_sessions.status", "COMPLETED")
      .order("created_at", { ascending: false })
      .limit(2),
    getAvailableTopics(session.userId),
  ]);
  if (profileResult.error || goalResult.error || streakResult.error || totalXpResult.error || sessionXpResult.error || recentAssessmentsResult.error) {
    throw new Error("Unable to load General result progress.");
  }
  const profile = profileResult.data;
  const goal = goalResult.data;
  if (!profile || !goal) throw new Error("Learner progress is unavailable.");
  const totalXp = Number(totalXpResult.data ?? 0);
  if (!Number.isFinite(totalXp) || totalXp < 0) throw new Error("Unable to load General result progress.");
  const now = new Date();
  const localDate = learnerLocalDate(now, profile.timezone);
  const { data: daily, error: dailyError } = await db
    .from("daily_progress")
    .select("completed_answers,daily_answer_target,goal_achieved_at")
    .eq("user_id", session.userId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (dailyError) throw new Error("Unable to load daily progress.");

  return mapGeneralResultExperience({
    session,
    now,
    profile: { level: profile.level as LearnerLevel, timezone: profile.timezone },
    goal,
    daily,
    streak: streakResult.data,
    totalXp,
    sessionXp: sessionXpResult.data ?? [],
    topics,
    recentAssessments: (recentAssessmentsResult.data ?? []) as RecentAssessmentRow[],
  });
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
