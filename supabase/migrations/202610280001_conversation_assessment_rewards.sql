-- Role-play feedback and rewards. Additive: practice rewards and existing RPCs are unchanged.
begin;

alter table public.conversation_sessions
  add column assessment jsonb check (assessment is null or jsonb_typeof(assessment) = 'object'),
  add column assessed_at timestamptz,
  add column reward_xp integer not null default 0 check (reward_xp >= 0);

-- The original amount rule is an unnamed multi-column check (Postgres names it xp_events_check);
-- find it by definition so the replacement below is the only amount rule.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.xp_events'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%amount%'
  loop
    execute format('alter table public.xp_events drop constraint %I', c.conname);
  end loop;
end $$;

-- xp_events.session_id references practice_sessions, so role-play events use their own column.
alter table public.xp_events
  add column conversation_session_id uuid references public.conversation_sessions(id) on delete set null,
  drop constraint xp_events_event_type_check,
  add constraint xp_events_event_type_check
    check (event_type in ('ANSWER', 'SESSION', 'DAILY_GOAL', 'FIRST_TOPIC', 'CONVERSATION')),
  add constraint xp_events_amount_check check (
    (event_type = 'ANSWER' and amount = 10)
    or (event_type = 'SESSION' and amount = 25)
    or (event_type = 'DAILY_GOAL' and amount = 30)
    or (event_type = 'FIRST_TOPIC' and amount = 20)
    or (event_type = 'CONVERSATION' and amount = 25)
  );

-- Saves the first validated assessment of an ended session and grants its rewards atomically.
-- Replays return the stored XP without re-awarding. Sessions with fewer than 3 learner turns are not assessed.
create function public.save_conversation_assessment(p_session_id uuid, p_user_id uuid, p_assessment jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  s conversation_sessions;
  v_event_id uuid;
  v_awarded integer := 0;
  v_timezone text;
  v_target integer;
  v_local_date date;
  v_completed integer;
  v_goal_achieved_at timestamptz;
  v_last_goal_date date;
  v_current integer;
  v_longest integer;
begin
  select * into s from conversation_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if s.status <> 'COMPLETED' then raise exception 'NOT_ENDED'; end if;
  if s.user_turn_count < 3 then raise exception 'TOO_SHORT'; end if;
  if s.assessment is not null then return s.reward_xp; end if;
  if jsonb_typeof(p_assessment) is distinct from 'object' then raise exception 'INVALID_ASSESSMENT'; end if;

  insert into xp_events(user_id, event_type, amount, conversation_session_id, idempotency_key)
  values (p_user_id, 'CONVERSATION', 25, s.id, 'CONVERSATION:' || s.id::text)
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    v_awarded := 25;

    select p.timezone, g.daily_answer_target into v_timezone, v_target
    from profiles p left join learning_goals g on g.user_id = p.user_id
    where p.user_id = p_user_id;

    -- Learner turns count as answers toward the daily goal, capped like one five-question session.
    if v_timezone is not null and v_target is not null then
      v_local_date := (coalesce(s.completed_at, now()) at time zone v_timezone)::date;

      insert into daily_progress(user_id, local_date, completed_answers, daily_answer_target)
      values (p_user_id, v_local_date, least(s.user_turn_count, 5), v_target)
      on conflict (user_id, local_date) do update
      set completed_answers = daily_progress.completed_answers + excluded.completed_answers,
          daily_answer_target = coalesce(daily_progress.daily_answer_target, excluded.daily_answer_target)
      returning daily_progress.completed_answers, daily_progress.goal_achieved_at, daily_progress.daily_answer_target
      into v_completed, v_goal_achieved_at, v_target;

      if v_completed >= v_target and v_goal_achieved_at is null then
        update daily_progress
        set goal_achieved_at = now()
        where user_id = p_user_id and local_date = v_local_date and goal_achieved_at is null and completed_answers >= v_target;

        if found then
          insert into user_streaks(user_id) values (p_user_id) on conflict (user_id) do nothing;

          select current_streak, longest_streak, last_goal_achieved_date
          into v_current, v_longest, v_last_goal_date
          from user_streaks where user_id = p_user_id
          for update;

          if v_last_goal_date = v_local_date then
            null;
          elsif v_last_goal_date = v_local_date - 1 then
            v_current := v_current + 1;
          else
            v_current := 1;
          end if;

          update user_streaks
          set current_streak = v_current,
              longest_streak = greatest(v_longest, v_current),
              last_goal_achieved_date = v_local_date,
              updated_at = now()
          where user_id = p_user_id;

          -- Same key as practice: the daily goal pays out once per learner and day, whichever mode reaches it.
          insert into xp_events(user_id, event_type, amount, conversation_session_id, idempotency_key)
          values (p_user_id, 'DAILY_GOAL', 30, s.id, 'DAILY_GOAL:' || p_user_id::text || ':' || v_local_date::text)
          on conflict (idempotency_key) do nothing
          returning id into v_event_id;

          if v_event_id is not null then
            v_awarded := v_awarded + 30;
          end if;
        end if;
      end if;
    end if;
  end if;

  update conversation_sessions
  set assessment = p_assessment, assessed_at = now(), reward_xp = v_awarded
  where id = s.id;
  return v_awarded;
end $$;

revoke all on function public.save_conversation_assessment(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_conversation_assessment(uuid,uuid,jsonb) to service_role;
commit;
