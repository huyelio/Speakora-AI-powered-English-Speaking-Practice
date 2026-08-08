import "server-only";
import { getSupabaseAdminClient } from "../../lib/supabase/server";
import { tokenMatches } from "./auth";
import type { Assessment, SessionQuestion, SessionStatus } from "./types";

type RpcRow = { session_id: string; session_question_id: string; sequence_no: number; prompt_snapshot: Record<string, unknown> };

export async function createPracticeSession(tokenHash: string) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db.rpc("create_ielts_practice_session", { p_token_hash: tokenHash, p_question_count: 5 });
  if (error) throw error;
  const rows = data as RpcRow[];
  if (!rows?.length) throw new Error("Unable to create practice session.");
  return { sessionId: rows[0].session_id, questions: rows.map(mapQuestion) };
}

function mapQuestion(row: RpcRow): SessionQuestion {
  const p = row.prompt_snapshot as any;
  return { sessionQuestionId: row.session_question_id, sequenceNo: row.sequence_no, id: p.id, code: p.code,
    promptText: p.prompt_text, instructionText: p.instruction_text, prepSeconds: p.prep_seconds,
    answerSeconds: p.answer_seconds, questionType: p.question_type, topic: p.topic,
    promptItems: (p.prompt_items || []).map((i: any) => ({ content: i.content, sequenceNo: i.sequence_no })) };
}

export async function authorizeSession(sessionId: string, token: string) {
  if (!token) return null;
  const { data, error } = await getSupabaseAdminClient().from("practice_sessions").select("id,status,guest_token_hash,question_count").eq("id", sessionId).maybeSingle();
  if (error) throw error;
  return data && tokenMatches(token, data.guest_token_hash) ? data : null;
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

export async function getAssessment(sessionId:string):Promise<Assessment|null>{
  const {data,error}=await getSupabaseAdminClient().from("session_assessments").select("estimated_band,overall_feedback,strengths,improvements,next_steps").eq("session_id",sessionId).maybeSingle();
  if(error) throw error; if(!data) return null;
  return {estimatedBand:Number(data.estimated_band),overallFeedback:data.overall_feedback,strengths:data.strengths as string[],improvements:data.improvements as string[],nextSteps:data.next_steps as string[]};
}
