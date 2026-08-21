create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  level text not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  learning_purpose text not null check (char_length(learning_purpose) between 1 and 160),
  timezone text not null,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_answer_target integer not null check (daily_answer_target between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  completed_answers integer not null default 0 check (completed_answers >= 0),
  goal_achieved_at timestamptz,
  primary key (user_id, local_date)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('ANSWER', 'SESSION', 'DAILY_GOAL', 'FIRST_TOPIC')),
  amount integer not null check (
    (event_type = 'ANSWER' and amount = 10)
    or (event_type = 'SESSION' and amount = 25)
    or (event_type = 'DAILY_GOAL' and amount = 30)
    or (event_type = 'FIRST_TOPIC' and amount = 20)
  ),
  session_id uuid,
  answer_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_goal_achieved_date date,
  updated_at timestamptz not null default now(),
  check (longest_streak >= current_streak)
);

alter table public.practice_sessions
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists difficulty_level text check (difficulty_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  add column if not exists session_kind text;

alter table public.practice_sessions
  alter column guest_token_hash drop not null;

alter table public.practice_sessions
  drop constraint if exists practice_sessions_mode_check,
  add constraint practice_sessions_mode_check check (mode in ('IELTS', 'GENERAL')),
  add constraint practice_sessions_owner_check check (
    (user_id is not null) <> (guest_token_hash is not null)
  );

alter table public.xp_events
  add constraint xp_events_session_id_fkey foreign key (session_id)
    references public.practice_sessions(id) on delete set null,
  add constraint xp_events_answer_id_fkey foreign key (answer_id)
    references public.user_answers(id) on delete set null;

create index xp_events_user_id_created_at_idx on public.xp_events(user_id, created_at);
create index daily_progress_user_id_local_date_idx on public.daily_progress(user_id, local_date desc);

alter table public.profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.daily_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_streaks enable row level security;

create policy "Learners can view own profile"
on public.profiles for select
using (auth.uid() = user_id);

create policy "Learners can update own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Learners can view own learning goal"
on public.learning_goals for select
using (auth.uid() = user_id);

create policy "Learners can update own learning goal"
on public.learning_goals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Learners can view own daily progress"
on public.daily_progress for select
using (auth.uid() = user_id);

create policy "Learners can view own XP events"
on public.xp_events for select
using (auth.uid() = user_id);

create policy "Learners can view own streak"
on public.user_streaks for select
using (auth.uid() = user_id);

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

    insert into public.daily_progress(user_id, local_date, completed_answers)
    values (v_user_id, v_local_date, 1)
    on conflict (user_id, local_date) do update
    set completed_answers = public.daily_progress.completed_answers + 1
    returning completed_answers, goal_achieved_at
    into v_completed_answers, v_goal_achieved_at;

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

  select completed_answers, goal_achieved_at
  into v_completed_answers, v_goal_achieved_at
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

revoke all on function public.record_answer_progress(uuid) from public, anon, authenticated;
revoke all on function public.complete_session_rewards(uuid) from public, anon, authenticated;
grant execute on function public.record_answer_progress(uuid) to service_role;
grant execute on function public.complete_session_rewards(uuid) to service_role;
