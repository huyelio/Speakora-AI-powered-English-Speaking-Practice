create extension if not exists pgcrypto;

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  mode varchar(20) not null check (mode = 'IELTS'),
  status varchar(20) not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','PROCESSING','COMPLETED','FAILED')),
  guest_token_hash text not null,
  question_count smallint not null default 5 check (question_count = 5),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  question_version integer not null,
  sequence_no smallint not null check (sequence_no between 1 and 5),
  prompt_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(session_id, sequence_no), unique(session_id, question_id)
);

create table public.user_answers (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null unique references public.session_questions(id) on delete cascade,
  status varchar(20) not null default 'UPLOADED' check (status in ('UPLOADED','TRANSCRIBING','TRANSCRIBED','FAILED')),
  storage_bucket text not null default 'speaking-answers',
  storage_path text not null unique,
  mime_type varchar(100) not null,
  duration_ms integer not null check (duration_ms >= 0),
  size_bytes integer not null check (size_bytes > 0),
  idempotency_key uuid not null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_question_id, idempotency_key)
);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.user_answers(id) on delete cascade,
  text text not null,
  provider varchar(50) not null,
  model varchar(100) not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  answer_id uuid null references public.user_answers(id) on delete cascade,
  job_type varchar(20) not null check (job_type in ('STT','ASSESSMENT')),
  status varchar(20) not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  attempt_count smallint not null default 0,
  max_attempts smallint not null default 3,
  next_retry_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index processing_jobs_stt_unique on public.processing_jobs(answer_id, job_type) where job_type = 'STT';
create unique index processing_jobs_assessment_unique on public.processing_jobs(session_id, job_type) where job_type = 'ASSESSMENT';
create index processing_jobs_claim_idx on public.processing_jobs(status, next_retry_at, created_at);

create table public.session_assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.practice_sessions(id) on delete cascade,
  estimated_band numeric(2,1) not null check (estimated_band between 0 and 9),
  overall_feedback text not null,
  strengths jsonb not null,
  improvements jsonb not null,
  next_steps jsonb not null,
  provider varchar(50) not null,
  model varchar(100) not null,
  prompt_version varchar(50) not null,
  raw_output jsonb not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-answers','speaking-answers',false,26214400,array['audio/webm','audio/mp4','audio/ogg','audio/webm;codecs=opus','audio/ogg;codecs=opus'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

alter table public.practice_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.user_answers enable row level security;
alter table public.transcripts enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.session_assessments enable row level security;

create or replace function public.create_ielts_practice_session(p_token_hash text, p_question_count integer default 5)
returns table(session_id uuid, session_question_id uuid, sequence_no smallint, prompt_snapshot jsonb)
language plpgsql security definer set search_path=public as $$
declare v_session_id uuid;
begin
  if p_question_count <> 5 then raise exception 'question_count must be 5'; end if;
  insert into practice_sessions(mode, guest_token_hash, question_count) values ('IELTS', p_token_hash, 5) returning id into v_session_id;
  insert into session_questions(session_id, question_id, question_version, sequence_no, prompt_snapshot)
  select v_session_id, q.id, q.version, row_number() over ()::smallint,
    jsonb_build_object('id',q.id,'code',q.code,'prompt_text',q.prompt_text,'instruction_text',q.instruction_text,
      'prep_seconds',coalesce(q.prep_seconds,qt.default_prep_seconds),'answer_seconds',coalesce(q.answer_seconds,qt.default_answer_seconds),
      'question_type',qt.code,'topic',case when t.id is null then null else jsonb_build_object('slug',t.slug,'name',t.name) end,
      'prompt_items',coalesce((select jsonb_agg(jsonb_build_object('content',i.content,'sequence_no',i.sequence_no) order by i.sequence_no) from question_prompt_items i where i.question_id=q.id),'[]'::jsonb))
  from (select q.* from questions q join practice_modes pm on pm.id=q.mode_id where pm.code='IELTS' and pm.is_active and q.status='ACTIVE' order by random() limit 5) q
  join question_types qt on qt.id=q.question_type_id left join topics t on t.id=q.topic_id;
  if (select count(*) from session_questions sq_count where sq_count.session_id=v_session_id) <> 5 then raise exception 'Not enough active IELTS questions'; end if;
  return query select sq.session_id,sq.id,sq.sequence_no,sq.prompt_snapshot from session_questions sq where sq.session_id=v_session_id order by sq.sequence_no;
end $$;

create or replace function public.claim_processing_job(p_worker_id text)
returns setof public.processing_jobs language plpgsql security definer set search_path=public as $$
begin
  return query update processing_jobs j set status='RUNNING', attempt_count=attempt_count+1, locked_at=now(), locked_by=p_worker_id, updated_at=now()
  where j.id=(select id from processing_jobs where ((status='QUEUED' and next_retry_at<=now()) or (status='RUNNING' and locked_at<now()-interval '5 minutes')) order by created_at for update skip locked limit 1)
  returning j.*;
end $$;

create or replace function public.register_practice_answer(
  p_answer_id uuid, p_session_id uuid, p_session_question_id uuid, p_storage_path text,
  p_mime_type text, p_duration_ms integer, p_size_bytes integer, p_idempotency_key uuid
)
returns table(answer_id uuid, answer_status varchar, sequence_no smallint)
language plpgsql security definer set search_path=public as $$
declare v_answer user_answers%rowtype; v_sequence smallint;
begin
  select sq.sequence_no into v_sequence from session_questions sq where sq.id=p_session_question_id and sq.session_id=p_session_id;
  if v_sequence is null then raise exception 'Question not found in session'; end if;
  select * into v_answer from user_answers where session_question_id=p_session_question_id;
  if v_answer.id is null then
    insert into user_answers(id,session_question_id,storage_path,mime_type,duration_ms,size_bytes,idempotency_key)
    values(p_answer_id,p_session_question_id,p_storage_path,p_mime_type,p_duration_ms,p_size_bytes,p_idempotency_key) returning * into v_answer;
    insert into processing_jobs(session_id,answer_id,job_type) values(p_session_id,v_answer.id,'STT');
  elsif v_answer.idempotency_key <> p_idempotency_key then
    raise exception 'Question already has an answer';
  end if;
  return query select v_answer.id,v_answer.status,v_sequence;
end $$;

revoke all on function public.create_ielts_practice_session(text,integer) from public, anon, authenticated;
revoke all on function public.claim_processing_job(text) from public, anon, authenticated;
revoke all on function public.register_practice_answer(uuid,uuid,uuid,text,text,integer,integer,uuid) from public, anon, authenticated;
grant execute on function public.create_ielts_practice_session(text,integer) to service_role;
grant execute on function public.claim_processing_job(text) to service_role;
grant execute on function public.register_practice_answer(uuid,uuid,uuid,text,text,integer,integer,uuid) to service_role;
