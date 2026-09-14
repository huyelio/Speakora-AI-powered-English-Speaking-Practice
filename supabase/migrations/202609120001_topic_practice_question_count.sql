alter table public.topics
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists difficulty_level text check (
    difficulty_level is null
    or difficulty_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')
  );

alter table public.practice_sessions
  drop constraint if exists practice_sessions_question_count_check;

alter table public.practice_sessions
  add constraint practice_sessions_question_count_check
    check (question_count between 1 and 20);

alter table public.session_questions
  drop constraint if exists session_questions_sequence_no_check;

alter table public.session_questions
  add constraint session_questions_sequence_no_check
    check (sequence_no >= 1);

create index if not exists questions_topic_id_active_idx
  on public.questions (topic_id)
  where status = 'ACTIVE';

drop function if exists public.create_general_practice_session(uuid, uuid, text, uuid[]);

create or replace function public.create_general_practice_session(
  p_user_id uuid,
  p_topic_id uuid,
  p_question_ids uuid[]
)
returns table(session_id uuid, session_question_id uuid, sequence_no smallint, prompt_snapshot jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_general_mode_id uuid;
  v_question_count integer;
  v_topic_difficulty text;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Practice user does not exist';
  end if;

  select id
  into v_general_mode_id
  from public.practice_modes
  where code = 'GENERAL' and is_active;
  if v_general_mode_id is null then
    raise exception 'General practice mode is unavailable';
  end if;

  v_question_count := array_length(p_question_ids, 1);
  if v_question_count is null
    or v_question_count < 1
    or v_question_count > 20
    or (select count(distinct question_id) from unnest(p_question_ids) as selected(question_id)) <> v_question_count then
    raise exception 'question_ids must contain between one and twenty unique questions';
  end if;

  perform q.id
  from public.questions q
  join public.practice_modes pm on pm.id = q.mode_id
  join public.topics t on t.id = q.topic_id
  join public.question_types qt on qt.id = q.question_type_id
  where q.id = any(p_question_ids)
  for update of q, pm, t, qt;

  if not exists (
    select 1
    from public.topics t
    where t.id = p_topic_id
      and t.mode_id = v_general_mode_id
      and t.is_active
  ) then
    raise exception 'General topic is unavailable';
  end if;

  select t.difficulty_level
  into v_topic_difficulty
  from public.topics t
  where t.id = p_topic_id;

  if exists (
    select 1
    from unnest(p_question_ids) as selected(question_id)
    left join public.questions q
      on q.id = selected.question_id
      and q.topic_id = p_topic_id
      and q.status = 'ACTIVE'
    left join public.practice_modes pm
      on pm.id = q.mode_id
      and pm.id = v_general_mode_id
      and pm.code = 'GENERAL' and pm.is_active
    left join public.topics t
      on t.id = q.topic_id
      and t.id = p_topic_id
      and t.mode_id = v_general_mode_id
      and t.is_active
    left join public.question_types qt
      on qt.id = q.question_type_id
      and qt.is_active
    where q.id is null or pm.id is null or t.id is null or qt.id is null
  ) then
    raise exception 'questions must be active General questions for the requested topic';
  end if;

  insert into public.practice_sessions(user_id, topic_id, mode, difficulty_level, question_count)
  values (p_user_id, p_topic_id, 'GENERAL', v_topic_difficulty, v_question_count)
  returning id into v_session_id;

  insert into public.session_questions(session_id, question_id, question_version, sequence_no, prompt_snapshot)
  select
    v_session_id,
    q.id,
    q.version,
    selected.sequence_no::smallint,
    jsonb_build_object(
      'id', q.id,
      'code', q.code,
      'prompt_text', q.prompt_text,
      'instruction_text', q.instruction_text,
      'prep_seconds', coalesce(q.prep_seconds, qt.default_prep_seconds),
      'answer_seconds', coalesce(q.answer_seconds, qt.default_answer_seconds),
      'question_type', qt.code,
      'topic', jsonb_build_object('slug', t.slug, 'name', t.name),
      'prompt_items', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object('content', i.content, 'sequence_no', i.sequence_no)
            order by i.sequence_no
          )
          from public.question_prompt_items i
          where i.question_id = q.id
        ),
        '[]'::jsonb
      )
    )
  from unnest(p_question_ids) with ordinality as selected(question_id, sequence_no)
  join public.questions q on q.id = selected.question_id
  join public.question_types qt on qt.id = q.question_type_id
  join public.topics t on t.id = q.topic_id;

  return query
  select sq.session_id, sq.id, sq.sequence_no, sq.prompt_snapshot
  from public.session_questions sq
  where sq.session_id = v_session_id
  order by sq.sequence_no;
end;
$$;

revoke all on function public.create_general_practice_session(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.create_general_practice_session(uuid, uuid, uuid[]) to service_role;
