import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "../lib/supabase/config";
import { OpenAIProvider } from "../modules/ai-gateway/openai";

const {url,secretKey}=getSupabaseConfiguration();
const db=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false}});
const provider=new OpenAIProvider();
const workerId=`worker-${randomUUID()}`;
const pollMs=Number(process.env.WORKER_POLL_MS||1500);
let stopping=false;
process.on("SIGINT",()=>{stopping=true;}); process.on("SIGTERM",()=>{stopping=true;});

type Job={id:string;session_id:string;answer_id:string|null;job_type:"STT"|"ASSESSMENT";attempt_count:number;max_attempts:number};
async function claim(){const {data,error}=await db.rpc("claim_processing_job",{p_worker_id:workerId});if(error)throw error;return (data?.[0]||null) as Job|null;}
async function succeed(id:string){const {error}=await db.from("processing_jobs").update({status:"SUCCEEDED",locked_at:null,locked_by:null,error_message:null,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;}
async function fail(job:Job,error:unknown){const message=(error instanceof Error?error.message:String(error)).slice(0,1000);const terminal=job.attempt_count>=job.max_attempts;const delay=Math.min(60,2**job.attempt_count);await db.from("processing_jobs").update({status:terminal?"FAILED":"QUEUED",next_retry_at:new Date(Date.now()+delay*1000).toISOString(),locked_at:null,locked_by:null,error_message:message,updated_at:new Date().toISOString()}).eq("id",job.id);if(terminal&&job.answer_id)await db.from("user_answers").update({status:"FAILED",error_message:message}).eq("id",job.answer_id);if(terminal)await db.from("practice_sessions").update({status:"FAILED"}).eq("id",job.session_id);}

async function runStt(job:Job){
  const {data:answer,error}=await db.from("user_answers").select("id,storage_bucket,storage_path,mime_type").eq("id",job.answer_id!).single();if(error)throw error;
  await db.from("user_answers").update({status:"TRANSCRIBING",error_message:null}).eq("id",answer.id);
  const {data:file,error:downloadError}=await db.storage.from(answer.storage_bucket).download(answer.storage_path);if(downloadError)throw downloadError;
  const text=await provider.transcribe(file,answer.storage_path.split("/").pop()||"answer.webm");
  const {error:transcriptError}=await db.from("transcripts").upsert({answer_id:answer.id,text,provider:"openai",model:process.env.OPENAI_STT_MODEL||"gpt-4o-mini-transcribe",provider_metadata:{}},{onConflict:"answer_id"});if(transcriptError)throw transcriptError;
  await db.from("user_answers").update({status:"TRANSCRIBED",error_message:null}).eq("id",answer.id);
  await succeed(job.id);
  const {count}=await db.from("user_answers").select("id,session_questions!inner(session_id)",{count:"exact",head:true}).eq("session_questions.session_id",job.session_id).eq("status","TRANSCRIBED");
  if(count===5){const {error}=await db.from("processing_jobs").insert({session_id:job.session_id,answer_id:null,job_type:"ASSESSMENT"});if(error&&error.code!=="23505")throw error;await db.from("practice_sessions").update({status:"PROCESSING"}).eq("id",job.session_id);}
}

function validateAssessment(value:any){if(!value||typeof value.overall_feedback!=="string"||!Array.isArray(value.strengths)||!Array.isArray(value.improvements)||!Array.isArray(value.next_steps)||typeof value.estimated_band!=="number"||value.estimated_band<0||value.estimated_band>9||value.estimated_band*2%1!==0)throw new Error("Invalid assessment output.");return value;}
async function runAssessment(job:Job){
  const {data,error}=await db.from("session_questions").select("sequence_no,prompt_snapshot,user_answers!inner(transcripts!inner(text))").eq("session_id",job.session_id).order("sequence_no");if(error)throw error;if(data?.length!==5)throw new Error("Session does not have five transcripts.");
  const input=(data as any[]).map(q=>{const answer=Array.isArray(q.user_answers)?q.user_answers[0]:q.user_answers;const transcript=Array.isArray(answer.transcripts)?answer.transcripts[0]:answer.transcripts;return `Question ${q.sequence_no}: ${q.prompt_snapshot.prompt_text}\nAnswer: ${transcript.text}`;}).join("\n\n");
  const result=validateAssessment(await provider.assess(input));
  const {error:saveError}=await db.from("session_assessments").upsert({session_id:job.session_id,estimated_band:result.estimated_band,overall_feedback:result.overall_feedback,strengths:result.strengths,improvements:result.improvements,next_steps:result.next_steps,provider:"openai",model:process.env.OPENAI_ASSESSMENT_MODEL||"gpt-4o-mini",prompt_version:"ielts-session-v1",raw_output:result},{onConflict:"session_id"});if(saveError)throw saveError;
  await db.from("practice_sessions").update({status:"COMPLETED",completed_at:new Date().toISOString()}).eq("id",job.session_id);await succeed(job.id);
}

async function main(){console.log(`[worker] ${workerId} started`);while(!stopping){try{const job=await claim();if(!job){await new Promise(r=>setTimeout(r,pollMs));continue;}try{if(job.job_type==="STT")await runStt(job);else await runAssessment(job);}catch(error){console.error(`[worker] job ${job.id} failed`,error);await fail(job,error);}}catch(error){console.error("[worker] polling failed",error);await new Promise(r=>setTimeout(r,5000));}}console.log("[worker] stopped");}
void main();
