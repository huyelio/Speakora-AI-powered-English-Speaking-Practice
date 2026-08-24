create or replace function public.retry_failed_processing_jobs(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_status text;
  v_retry_count integer := 0;
begin
  select status
  into v_session_status
  from public.practice_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Practice session not found';
  end if;

  if v_session_status <> 'FAILED' then
    return 0;
  end if;

  with retried_jobs as (
    update public.processing_jobs
    set status = 'QUEUED',
        attempt_count = 0,
        next_retry_at = now(),
        locked_at = null,
        locked_by = null,
        error_message = null,
        updated_at = now()
    where session_id = p_session_id
      and status = 'FAILED'
    returning answer_id
  ), repaired_answers as (
    update public.user_answers
    set status = 'UPLOADED',
        error_message = null,
        updated_at = now()
    where id in (
      select answer_id
      from retried_jobs
      where answer_id is not null
    )
      and status = 'FAILED'
    returning id
  )
  select count(*)::integer
  into v_retry_count
  from retried_jobs;

  if v_retry_count > 0 then
    update public.practice_sessions
    set status = 'PROCESSING',
        updated_at = now()
    where id = p_session_id
      and status = 'FAILED';
  end if;

  return v_retry_count;
end;
$$;

revoke all on function public.retry_failed_processing_jobs(uuid) from public, anon, authenticated;
grant execute on function public.retry_failed_processing_jobs(uuid) to service_role;
