drop policy if exists "Learners can update own profile" on public.profiles;
drop policy if exists "Learners can update own learning goal" on public.learning_goals;
revoke update on table public.profiles, public.learning_goals from authenticated;

create or replace function public.upsert_learner_onboarding(
  p_user_id uuid,
  p_display_name text,
  p_level text,
  p_learning_purpose text,
  p_timezone text,
  p_daily_answer_target integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text := btrim(p_display_name);
  v_learning_purpose text := btrim(p_learning_purpose);
  v_timezone text := btrim(p_timezone);
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Authenticated user does not match the requested profile';
  end if;

  if coalesce(char_length(v_display_name), 0) not between 1 and 80 then
    raise exception 'Display name must be between 1 and 80 characters';
  end if;

  if p_level is null or p_level not in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED') then
    raise exception 'Invalid learner level';
  end if;

  if coalesce(char_length(v_learning_purpose), 0) not between 1 and 160 then
    raise exception 'Learning purpose must be between 1 and 160 characters';
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    raise exception 'Invalid IANA timezone';
  end if;

  if p_daily_answer_target is null or p_daily_answer_target not between 1 and 100 then
    raise exception 'Daily answer target must be between 1 and 100';
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    level,
    learning_purpose,
    timezone,
    onboarding_completed_at,
    updated_at
  )
  values (
    p_user_id,
    v_display_name,
    p_level,
    v_learning_purpose,
    v_timezone,
    now(),
    now()
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      level = excluded.level,
      learning_purpose = excluded.learning_purpose,
      timezone = excluded.timezone,
      onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
      updated_at = now();

  insert into public.learning_goals (
    user_id,
    daily_answer_target,
    updated_at
  )
  values (p_user_id, p_daily_answer_target, now())
  on conflict (user_id) do update
  set daily_answer_target = excluded.daily_answer_target,
      updated_at = now();
end;
$$;

revoke all on function public.upsert_learner_onboarding(uuid, text, text, text, text, integer)
from public, anon;
grant execute on function public.upsert_learner_onboarding(uuid, text, text, text, text, integer)
to authenticated;
