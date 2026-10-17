-- Learner onboarding preferences; retain legacy levels and answer goals for practice.
alter table public.profiles
  add column current_level text check (current_level in ('A1','A2','B1','B2','C1','C2')),
  add column level_source text check (level_source in ('SELF_REPORTED','QUICK_CHECK')),
  add column target_score numeric,
  add column preferred_topics uuid[] not null default '{}';
alter table public.learning_goals
  add column daily_goal_minutes integer not null default 10
    check (daily_goal_minutes in (5,10,15,20,30));

-- Remove the old RPC: its unconditional completion would bypass the quick check.
drop function public.upsert_learner_onboarding(uuid, text, text, text, text, integer);
create function public.upsert_learner_onboarding(
  p_user_id uuid,
  p_display_name text,
  p_current_level text,
  p_learning_purpose text,
  p_timezone text,
  p_target_score numeric,
  p_daily_goal_minutes integer,
  p_preferred_topics uuid[],
  p_complete_onboarding boolean default false,
  p_speaking_check_session_id uuid default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_level text := p_current_level;
  v_source text := case when p_current_level is not null then 'SELF_REPORTED' end;
  v_result jsonb;
  v_score numeric := p_target_score;
  v_legacy_level text;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Authenticated user does not match the requested profile';
  end if;
  if coalesce(char_length(btrim(p_display_name)),0) not between 1 and 80 then
    raise exception 'Invalid display name';
  end if;
  if v_level is not null and v_level not in ('A1','A2','B1','B2','C1','C2') then
    raise exception 'Invalid CEFR level';
  end if;
  if p_learning_purpose is null or p_learning_purpose   not in ('IELTS','TOEIC','Giao tiếp','Công việc','Du lịch','Phỏng vấn','Học tập') then
    raise exception 'Invalid learning goal';
  end if;
  if p_daily_goal_minutes is null or p_daily_goal_minutes not in (5,10,15,20,30) then
    raise exception 'Invalid daily minutes';
  end if;
  if not exists(select 1 from pg_timezone_names where name = btrim(p_timezone)) then
    raise exception 'Invalid IANA timezone';
  end if;
  if p_preferred_topics is null or cardinality(p_preferred_topics) not between 1 and 100 or
    exists(select 1 from unnest(p_preferred_topics) choice(topic_id) where choice.topic_id is null or not exists(
      select 1 from public.topics t join public.practice_modes pm on pm.id = t.mode_id
      where t.id = choice.topic_id and t.is_active and pm.code = 'GENERAL' and pm.is_active
    )) then
    raise exception 'Invalid preferred topics';
  end if;
  if p_learning_purpose = 'IELTS' and
    (v_score is null or v_score < 5 or v_score > 9 or mod(v_score * 2,1) <> 0) then
    raise exception 'Invalid IELTS target';
  elsif p_learning_purpose <> 'IELTS' then
    v_score := null;
  end if;

  -- A supplied assessment is authoritative, even alongside a self-selected level.
  if p_speaking_check_session_id is not null then
    select sa.raw_output into v_result
    from public.practice_sessions ps
    join public.session_assessments sa on sa.session_id = ps.id
    where ps.id = p_speaking_check_session_id and ps.user_id = auth.uid()
      and ps.status = 'COMPLETED' and ps.session_kind = 'QUICK_CHECK' and ps.question_count = 3
      and (select count(*) from public.session_questions sq where sq.session_id = ps.id) = 3
      and (select count(*) from public.session_questions sq join public.user_answers ua on ua.session_question_id = sq.id
           where sq.session_id = ps.id and ua.status = 'TRANSCRIBED') = 3;
    if v_result is null or jsonb_typeof(v_result) <> 'object'
      or coalesce(v_result->>'estimated_cefr','') not in ('A1','A2','B1','B2','C1','C2')
      or jsonb_typeof(v_result->'feedback') is distinct from 'string'
      or coalesce(char_length(btrim(v_result->>'feedback')),0) = 0
      or jsonb_typeof(v_result->'recommendation') is distinct from 'string'
      or coalesce(char_length(btrim(v_result->>'recommendation')),0) = 0 then
      raise exception 'A completed owned quick check with a valid result is required';
    end if;
    v_level := v_result->>'estimated_cefr';
    v_source := 'QUICK_CHECK';
  end if;
  if coalesce(p_complete_onboarding,false) and v_level is null then
    raise exception 'Unknown level requires a completed speaking check';
  end if;
  v_legacy_level := case when v_level in ('C1','C2') then 'ADVANCED'
    when v_level in ('B1','B2') then 'INTERMEDIATE' else 'BEGINNER' end;

  insert into public.profiles(user_id, display_name, level, learning_purpose, timezone,
    current_level, level_source, target_score, preferred_topics, onboarding_completed_at, updated_at)
  values(p_user_id, btrim(p_display_name), v_legacy_level, p_learning_purpose, btrim(p_timezone),
    v_level, v_source, v_score, p_preferred_topics,
    case when coalesce(p_complete_onboarding,false) then now() end, now())
  on conflict(user_id) do update set
    display_name = excluded.display_name,
    level = case when excluded.current_level is null then profiles.level else excluded.level end,
    learning_purpose = excluded.learning_purpose,
    timezone = excluded.timezone,
    current_level = excluded.current_level,
    level_source = case when p_speaking_check_session_id is null and
      profiles.current_level is not distinct from excluded.current_level then profiles.level_source else excluded.level_source end,
    target_score = excluded.target_score,
    preferred_topics = excluded.preferred_topics,
    onboarding_completed_at = coalesce(profiles.onboarding_completed_at, excluded.onboarding_completed_at),
    updated_at = now();
  insert into public.learning_goals(user_id,daily_answer_target,daily_goal_minutes,updated_at)
  values(p_user_id,5,p_daily_goal_minutes,now())
  on conflict(user_id) do update set daily_goal_minutes = excluded.daily_goal_minutes, updated_at = now();
end;
$$;
revoke all on function public.upsert_learner_onboarding(uuid,text,text,text,text,numeric,integer,uuid[],boolean,uuid) from public, anon;
grant execute on function public.upsert_learner_onboarding(uuid,text,text,text,text,numeric,integer,uuid[],boolean,uuid) to authenticated;
drop function if exists public.create_general_practice_session(uuid, uuid, uuid[]);

create or replace function public.create_general_practice_session(
  p_user_id uuid,
  p_topic_id uuid,
  p_question_ids uuid[],
  p_session_kind text default null
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

  if p_session_kind is not null and p_session_kind <> 'QUICK_CHECK' then
    raise exception 'Unsupported practice session kind';
  end if;
  if p_session_kind = 'QUICK_CHECK' and v_question_count <> 3 then
    raise exception 'Quick check requires exactly three questions';
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

  if p_session_kind = 'QUICK_CHECK' and exists (
    select 1
    from unnest(p_question_ids) with ordinality as selected(question_id, position)
    join public.questions q on q.id = selected.question_id
    where q.code !~ ('^GENERAL_[A-Z_]+_' || case selected.position when 1 then 'B_001' when 2 then 'I_001' else 'I_00[35]' end || '$')
      or q.difficulty_level <> case selected.position when 1 then 'BEGINNER' else 'INTERMEDIATE' end
  ) then
    raise exception 'Quick check questions must follow warmup, topic, opinion order';
  end if;

  insert into public.practice_sessions(user_id, topic_id, mode, difficulty_level, question_count, session_kind)
  values (p_user_id, p_topic_id, 'GENERAL', v_topic_difficulty, v_question_count, p_session_kind)
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

revoke all on function public.create_general_practice_session(uuid, uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.create_general_practice_session(uuid, uuid, uuid[], text) to service_role;

-- Defense in depth: rewards remain disabled for quick checks at the database boundary.
create or replace function public.record_answer_progress(p_answer_id uuid)
returns table (
  local_date date,
  completed_answers integer,
  daily_answer_target integer,
  goal_achieved_at timestamptz,
  current_streak integer,
  longest_streak integer,
  total_xp bigint,
  level integer,
  awarded_xp integer
)
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare
  v_user_id uuid;
  v_session_id uuid;
  v_timezone text;
  v_target integer;
  v_registered_at timestamptz;
  v_local_date date;
  v_completed_answers integer;
  v_goal_achieved_at timestamptz;
  v_last_goal_achieved_date date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_total_xp bigint;
  v_awarded_xp integer := 0;
  v_event_id uuid;
begin
  -- Placement checks never contribute to practice progress, streaks, or XP.
  if exists (
    select 1 from public.user_answers ua
    join public.session_questions sq on sq.id = ua.session_question_id
    join public.practice_sessions ps on ps.id = sq.session_id
    where ua.id = p_answer_id and ps.session_kind = 'QUICK_CHECK'
  ) then
    return;
  end if;
  select ps.user_id, ps.id, p.timezone, g.daily_answer_target, a.created_at
  into v_user_id, v_session_id, v_timezone, v_target, v_registered_at
  from public.user_answers a
  join public.session_questions sq on sq.id = a.session_question_id
  join public.practice_sessions ps on ps.id = sq.session_id
  left join public.profiles p on p.user_id = ps.user_id
  left join public.learning_goals g on g.user_id = ps.user_id
  where a.id = p_answer_id;

  if not found then
    raise exception 'Answer not found';
  end if;

  if v_user_id is null then
    return;
  end if;

  if v_timezone is null or v_target is null then
    raise exception 'Profile and learning goal are required';
  end if;

  v_local_date := (v_registered_at at time zone v_timezone)::date;

  insert into public.xp_events(user_id, event_type, amount, session_id, answer_id, idempotency_key)
  values (v_user_id, 'ANSWER', 10, v_session_id, p_answer_id, 'ANSWER:' || p_answer_id::text)
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    v_awarded_xp := v_awarded_xp + 10;

    insert into public.daily_progress(user_id, local_date, completed_answers, daily_answer_target)
    values (v_user_id, v_local_date, 1, v_target)
    on conflict (user_id, local_date) do update
    set completed_answers = public.daily_progress.completed_answers + 1,
        daily_answer_target = coalesce(public.daily_progress.daily_answer_target, excluded.daily_answer_target)
    returning completed_answers, goal_achieved_at, daily_answer_target
    into v_completed_answers, v_goal_achieved_at, v_target;

    if v_completed_answers >= v_target and v_goal_achieved_at is null then
      update public.daily_progress
      set goal_achieved_at = now()
      where user_id = v_user_id
        and local_date = v_local_date
        and goal_achieved_at is null
        and completed_answers >= v_target
      returning goal_achieved_at into v_goal_achieved_at;

      if found then
        insert into public.user_streaks(user_id)
        values (v_user_id)
        on conflict (user_id) do nothing;

        select current_streak, longest_streak, last_goal_achieved_date
        into v_current_streak, v_longest_streak, v_last_goal_achieved_date
        from public.user_streaks
        where user_id = v_user_id
        for update;

        if v_last_goal_achieved_date = v_local_date then
          null;
        elsif v_last_goal_achieved_date = v_local_date - 1 then
          v_current_streak := v_current_streak + 1;
        else
          v_current_streak := 1;
        end if;

        v_longest_streak := greatest(v_longest_streak, v_current_streak);

        update public.user_streaks
        set current_streak = v_current_streak,
            longest_streak = v_longest_streak,
            last_goal_achieved_date = v_local_date,
            updated_at = now()
        where user_id = v_user_id;

        insert into public.xp_events(user_id, event_type, amount, session_id, idempotency_key)
        values (v_user_id, 'DAILY_GOAL', 30, v_session_id, 'DAILY_GOAL:' || v_user_id::text || ':' || v_local_date::text)
        on conflict (idempotency_key) do nothing
        returning id into v_event_id;

        if v_event_id is not null then
          v_awarded_xp := v_awarded_xp + 30;
        end if;
      end if;
    end if;
  end if;

  select completed_answers, goal_achieved_at, coalesce(daily_answer_target, v_target)
  into v_completed_answers, v_goal_achieved_at, v_target
  from public.daily_progress
  where user_id = v_user_id and local_date = v_local_date;

  select current_streak, longest_streak
  into v_current_streak, v_longest_streak
  from public.user_streaks
  where user_id = v_user_id;

  select coalesce(sum(amount), 0)::bigint
  into v_total_xp
  from public.xp_events
  where user_id = v_user_id;

  return query select
    v_local_date,
    coalesce(v_completed_answers, 0),
    v_target,
    v_goal_achieved_at,
    coalesce(v_current_streak, 0),
    coalesce(v_longest_streak, 0),
    v_total_xp,
    floor(v_total_xp::numeric / 250)::integer + 1,
    v_awarded_xp;
end;
$$;

create or replace function public.complete_session_rewards(p_session_id uuid)
returns table (
  total_xp bigint,
  level integer,
  awarded_xp integer
)
language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid;
  v_topic_id uuid;
  v_mode text;
  v_status text;
  v_total_xp bigint;
  v_awarded_xp integer := 0;
  v_event_id uuid;
begin
  if exists (
    select 1 from public.practice_sessions
    where id = p_session_id and session_kind = 'QUICK_CHECK'
  ) then
    return;
  end if;
  select user_id, topic_id, mode, status
  into v_user_id, v_topic_id, v_mode, v_status
  from public.practice_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Practice session not found';
  end if;

  if v_user_id is null then
    return;
  end if;

  if v_status <> 'COMPLETED' or not exists (
    select 1 from public.session_assessments where session_id = p_session_id
  ) then
    raise exception 'Completed assessment required';
  end if;

  insert into public.xp_events(user_id, event_type, amount, session_id, idempotency_key)
  values (v_user_id, 'SESSION', 25, p_session_id, 'SESSION:' || p_session_id::text)
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    v_awarded_xp := v_awarded_xp + 25;
  end if;

  if v_mode = 'GENERAL' and v_topic_id is not null then
    insert into public.xp_events(user_id, event_type, amount, session_id, idempotency_key)
    values (v_user_id, 'FIRST_TOPIC', 20, p_session_id, 'FIRST_TOPIC:' || v_user_id::text || ':' || v_topic_id::text)
    on conflict (idempotency_key) do nothing
    returning id into v_event_id;

    if v_event_id is not null then
      v_awarded_xp := v_awarded_xp + 20;
    end if;
  end if;

  select coalesce(sum(amount), 0)::bigint
  into v_total_xp
  from public.xp_events
  where user_id = v_user_id;

  return query select
    v_total_xp,
    floor(v_total_xp::numeric / 250)::integer + 1,
    v_awarded_xp;
end;
$$;

-- Quick speaking checks must not affect ordinary topic recommendations or counts.
create or replace function public.get_learner_topic_history(p_user_id uuid)
returns table (
  topic_id uuid,
  practiced_count bigint,
  last_practiced_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ps.topic_id, count(*)::bigint, max(ps.completed_at)
  from public.practice_sessions ps
  where ps.user_id = p_user_id
    and ps.mode = 'GENERAL'
    and ps.status = 'COMPLETED'
    and ps.topic_id is not null
    and ps.session_kind is distinct from 'QUICK_CHECK'
  group by ps.topic_id;
$$;
revoke all on function public.get_learner_topic_history(uuid) from public, anon, authenticated;
grant execute on function public.get_learner_topic_history(uuid) to service_role;
