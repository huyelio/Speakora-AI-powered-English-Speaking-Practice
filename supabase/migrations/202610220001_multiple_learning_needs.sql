-- Multiple needs are saved atomically with the existing learner preferences.
alter table public.profiles add column learning_purposes text[];
update public.profiles set learning_purposes = array[learning_purpose];
alter table public.profiles alter column learning_purposes set not null;
alter table public.profiles add constraint profiles_learning_purposes_count
  check (cardinality(learning_purposes) between 1 and 11);
-- Remove the old overload to avoid ambiguous PostgREST RPC resolution.
drop function public.upsert_learner_onboarding(uuid,text,text,text,text,numeric,integer,uuid[],boolean,uuid);
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
  p_speaking_check_session_id uuid default null,
  p_learning_purposes text[] default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_level text := p_current_level;
  v_source text := case when p_current_level is not null then 'SELF_REPORTED' end;
  v_result jsonb;
  v_score numeric := p_target_score;
  v_legacy_level text;
  v_purposes text[] := coalesce(p_learning_purposes, array[p_learning_purpose]);
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
  if cardinality(v_purposes) not between 1 and 11 or exists (select 1 from unnest(v_purposes) goal where goal is null or goal not in ('IELTS','TOEIC','Giao tiếp','Công việc','Du lịch','Phỏng vấn','Học tập','Du học và định cư','Thuyết trình, nói trước đám đông','Kết bạn và giao lưu quốc tế','Phát triển bản thân')) or p_learning_purpose is null or not (p_learning_purpose = any(v_purposes)) then
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
  if 'IELTS' = any(v_purposes) and
    (v_score is null or v_score < 5 or v_score > 9 or mod(v_score * 2,1) <> 0) then
    raise exception 'Invalid IELTS target';
  elsif not ('IELTS' = any(v_purposes)) then
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

  insert into public.profiles(user_id, display_name, level, learning_purpose, learning_purposes, timezone,
    current_level, level_source, target_score, preferred_topics, onboarding_completed_at, updated_at)
  values(p_user_id, btrim(p_display_name), v_legacy_level, p_learning_purpose, v_purposes, btrim(p_timezone),
    v_level, v_source, v_score, p_preferred_topics,
    case when coalesce(p_complete_onboarding,false) then now() end, now())
  on conflict(user_id) do update set
    display_name = excluded.display_name,
    level = case when excluded.current_level is null then profiles.level else excluded.level end,
    learning_purpose = excluded.learning_purpose,
    learning_purposes = excluded.learning_purposes,
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
revoke all on function public.upsert_learner_onboarding(uuid,text,text,text,text,numeric,integer,uuid[],boolean,uuid,text[]) from public, anon;
grant execute on function public.upsert_learner_onboarding(uuid,text,text,text,text,numeric,integer,uuid[],boolean,uuid,text[]) to authenticated;
