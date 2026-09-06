create or replace function public.get_learner_xp_total(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.xp_events
  where user_id = p_user_id;
$$;

revoke all on function public.get_learner_xp_total(uuid) from public, anon, authenticated;
grant execute on function public.get_learner_xp_total(uuid) to service_role;

create index if not exists practice_sessions_user_created_id_idx
  on public.practice_sessions(user_id, created_at desc, id desc)
  where user_id is not null;

alter table public.daily_progress
  add column if not exists daily_answer_target integer
  check (daily_answer_target between 1 and 100);

update public.daily_progress dp
set daily_answer_target = g.daily_answer_target
from public.profiles p
join public.learning_goals g on g.user_id = p.user_id
where dp.user_id = p.user_id
  and dp.daily_answer_target is null
  and dp.local_date = (now() at time zone p.timezone)::date;

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

revoke all on function public.record_answer_progress(uuid) from public, anon, authenticated;
grant execute on function public.record_answer_progress(uuid) to service_role;

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
  group by ps.topic_id;
$$;

revoke all on function public.get_learner_topic_history(uuid) from public, anon, authenticated;
grant execute on function public.get_learner_topic_history(uuid) to service_role;

create or replace function public.get_general_topic_availability()
returns table (
  topic_id uuid,
  slug text,
  name text,
  difficulty_level text,
  available_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.slug::text,
    t.name::text,
    q.difficulty_level::text,
    count(*)::bigint
  from public.questions q
  join public.practice_modes pm on pm.id = q.mode_id
  join public.topics t on t.id = q.topic_id and t.mode_id = pm.id
  join public.question_types qt on qt.id = q.question_type_id
  where pm.code = 'GENERAL'
    and pm.is_active
    and t.is_active
    and qt.is_active
    and q.status = 'ACTIVE'
    and q.difficulty_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')
  group by t.id, t.slug, t.name, q.difficulty_level;
$$;

revoke all on function public.get_general_topic_availability() from public, anon, authenticated;
grant execute on function public.get_general_topic_availability() to service_role;
