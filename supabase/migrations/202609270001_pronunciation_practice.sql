-- Pronunciation Practice MVP: owned word sessions and provider-neutral attempts.

create table if not exists public.pronunciation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete restrict,
  level text not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  item_count smallint not null check (item_count between 1 and 20),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  source_session_id uuid references public.pronunciation_sessions (id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pronunciation_sessions_source_not_self check (source_session_id is null or source_session_id <> id),
  constraint pronunciation_sessions_completed_consistency check (
    (status = 'IN_PROGRESS' and completed_at is null)
    or (status = 'COMPLETED' and completed_at is not null)
  )
);

create index if not exists pronunciation_sessions_user_created_id_idx
  on public.pronunciation_sessions (user_id, created_at desc, id desc);
create index if not exists pronunciation_sessions_source_idx
  on public.pronunciation_sessions (source_session_id)
  where source_session_id is not null;

create table if not exists public.pronunciation_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pronunciation_sessions (id) on delete cascade,
  vocabulary_item_id uuid not null references public.vocabulary_items (id) on delete restrict,
  sequence_no smallint not null check (sequence_no >= 1),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint pronunciation_session_items_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint pronunciation_session_items_snapshot_word check (
    snapshot ? 'word' and char_length(trim(snapshot ->> 'word')) > 0
  ),
  constraint pronunciation_session_items_snapshot_ipa check (
    snapshot ? 'pronunciation_ipa' and char_length(trim(snapshot ->> 'pronunciation_ipa')) > 0
  ),
  constraint pronunciation_session_items_snapshot_meaning check (
    snapshot ? 'meaning_vi' and char_length(trim(snapshot ->> 'meaning_vi')) > 0
  ),
  constraint pronunciation_session_items_snapshot_level check (
    snapshot ? 'level' and snapshot ->> 'level' in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')
  ),
  unique (session_id, sequence_no),
  unique (session_id, vocabulary_item_id)
);

create table if not exists public.pronunciation_attempts (
  id uuid primary key,
  session_item_id uuid not null references public.pronunciation_session_items (id) on delete cascade,
  idempotency_key uuid not null,
  status text not null default 'UPLOADED' check (status in ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  storage_bucket text not null default 'speaking-answers',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  provider text,
  normalized_result jsonb,
  raw_result jsonb,
  sanitized_error_code text,
  sanitized_error_message text,
  created_at timestamptz not null default now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint pronunciation_attempts_storage_path_nonempty check (char_length(trim(storage_path)) > 0),
  constraint pronunciation_attempts_mime_type_nonempty check (char_length(trim(mime_type)) > 0),
  constraint pronunciation_attempts_error_code_safe check (
    sanitized_error_code is null
    or (char_length(sanitized_error_code) between 1 and 64 and sanitized_error_code ~ '^[A-Z0-9_]+$')
  ),
  constraint pronunciation_attempts_error_message_safe check (
    sanitized_error_message is null or char_length(sanitized_error_message) between 1 and 500
  ),
  constraint pronunciation_attempts_status_consistency check (
    (
      status = 'UPLOADED'
      and provider is null
      and normalized_result is null
      and raw_result is null
      and sanitized_error_code is null
      and sanitized_error_message is null
      and processing_started_at is null
      and completed_at is null
      and failed_at is null
    )
    or (
      status = 'PROCESSING'
      and provider is null
      and normalized_result is null
      and raw_result is null
      and sanitized_error_code is null
      and sanitized_error_message is null
      and processing_started_at is not null
      and completed_at is null
      and failed_at is null
    )
    or (
      status = 'COMPLETED'
      and provider is not null
      and char_length(trim(provider)) > 0
      and normalized_result is not null
      and jsonb_typeof(normalized_result) = 'object'
      and raw_result is not null
      and jsonb_typeof(raw_result) = 'object'
      and sanitized_error_code is null
      and sanitized_error_message is null
      and processing_started_at is not null
      and completed_at is not null
      and failed_at is null
    )
    or (
      status = 'FAILED'
      and normalized_result is null
      and raw_result is null
      and sanitized_error_code is not null
      and char_length(sanitized_error_code) > 0
      and sanitized_error_message is not null
      and char_length(sanitized_error_message) > 0
      and processing_started_at is not null
      and completed_at is null
      and failed_at is not null
    )
  ),
  unique (session_item_id, idempotency_key)
);

create index if not exists pronunciation_attempts_item_completed_idx
  on public.pronunciation_attempts (session_item_id, completed_at desc, id desc)
  where status = 'COMPLETED';
create index if not exists pronunciation_attempts_status_updated_idx
  on public.pronunciation_attempts (status, updated_at);

alter table public.pronunciation_sessions enable row level security;
alter table public.pronunciation_session_items enable row level security;
alter table public.pronunciation_attempts enable row level security;

create or replace function public.create_pronunciation_session(
  p_user_id uuid,
  p_topic_id uuid,
  p_level text,
  p_item_ids uuid[],
  p_source_session_id uuid default null
)
returns table (
  session_id uuid,
  session_item_id uuid,
  vocabulary_item_id uuid,
  sequence_no smallint,
  item_snapshot jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_general_mode_id uuid;
  v_item_count integer;
  v_source_topic_id uuid;
  v_source_level text;
  v_source_status text;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Pronunciation user does not exist';
  end if;

  if p_level is null or p_level not in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED') then
    raise exception 'Pronunciation level must be BEGINNER, INTERMEDIATE, or ADVANCED';
  end if;

  select id into v_general_mode_id
  from public.practice_modes
  where code = 'GENERAL' and is_active;
  if v_general_mode_id is null then
    raise exception 'General practice mode is unavailable';
  end if;

  if not exists (
    select 1
    from public.topics t
    where t.id = p_topic_id
      and t.mode_id = v_general_mode_id
      and t.is_active
  ) then
    raise exception 'General topic is unavailable';
  end if;

  v_item_count := array_length(p_item_ids, 1);
  if v_item_count is null
    or v_item_count < 1
    or v_item_count > 20
    or (select count(distinct item_id) from unnest(p_item_ids) selected(item_id)) <> v_item_count then
    raise exception 'item_ids must contain between one and twenty unique pronunciation items';
  end if;

  perform vi.id
  from public.vocabulary_items vi
  where vi.id = any(p_item_ids)
  for update of vi;

  if exists (
    select 1
    from unnest(p_item_ids) selected(item_id)
    left join public.vocabulary_items vi
      on vi.id = selected.item_id
      and vi.topic_id = p_topic_id
      and vi.level = p_level
      and vi.status = 'ACTIVE'
      and vi.pronunciation_ipa is not null
      and char_length(trim(vi.pronunciation_ipa)) > 0
    where vi.id is null
  ) then
    raise exception 'items must be active IPA-ready vocabulary for the requested topic and level';
  end if;

  if p_source_session_id is not null then
    select ps.topic_id, ps.level, ps.status
      into v_source_topic_id, v_source_level, v_source_status
    from public.pronunciation_sessions ps
    where ps.id = p_source_session_id
      and ps.user_id = p_user_id
    for share of ps;

    if not found then
      raise exception 'Owned pronunciation source session not found';
    end if;
    if v_source_status <> 'COMPLETED' then
      raise exception 'Pronunciation source session must be completed';
    end if;
    if v_source_topic_id <> p_topic_id or v_source_level <> p_level then
      raise exception 'Pronunciation source session topic or level does not match';
    end if;

    if exists (
      select 1
      from unnest(p_item_ids) selected(item_id)
      left join (
        select psi.vocabulary_item_id
        from public.pronunciation_session_items psi
        join lateral (
          select pa.normalized_result
          from public.pronunciation_attempts pa
          where pa.session_item_id = psi.id
            and pa.status = 'COMPLETED'
          order by pa.completed_at desc, pa.id desc
          limit 1
        ) latest on true
        where psi.session_id = p_source_session_id
          and (
            jsonb_path_exists(latest.normalized_result, '$.overall.accuracy ? (@ < 80)')
            or jsonb_path_exists(
              latest.normalized_result,
              '$.words[*].syllables[*] ? (@.accuracy < 70 || @.isMissing == true || @.isExtra == true)'
            )
          )
      ) weak on weak.vocabulary_item_id = selected.item_id
      where weak.vocabulary_item_id is null
    ) then
      raise exception 'Retry sessions may contain only weak source items';
    end if;
  end if;

  insert into public.pronunciation_sessions (
    user_id, topic_id, level, item_count, source_session_id
  ) values (
    p_user_id, p_topic_id, p_level, v_item_count, p_source_session_id
  ) returning id into v_session_id;

  insert into public.pronunciation_session_items (
    session_id, vocabulary_item_id, sequence_no, snapshot
  )
  select
    v_session_id,
    vi.id,
    selected.sequence_no::smallint,
    jsonb_build_object(
      'word', vi.word,
      'pronunciation_ipa', vi.pronunciation_ipa,
      'meaning_vi', vi.meaning_vi,
      'level', vi.level
    )
  from unnest(p_item_ids) with ordinality selected(item_id, sequence_no)
  join public.vocabulary_items vi on vi.id = selected.item_id;

  return query
  select
    psi.session_id,
    psi.id,
    psi.vocabulary_item_id,
    psi.sequence_no,
    psi.snapshot
  from public.pronunciation_session_items psi
  where psi.session_id = v_session_id
  order by psi.sequence_no;
end;
$$;

create or replace function public.register_pronunciation_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_session_item_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_duration_ms integer,
  p_size_bytes integer,
  p_idempotency_key uuid
)
returns table (
  attempt_id uuid,
  attempt_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.pronunciation_attempts%rowtype;
  v_session_status text;
begin
  if p_storage_path is null or char_length(trim(p_storage_path)) = 0
    or p_mime_type is null or char_length(trim(p_mime_type)) = 0
    or p_size_bytes is null or p_size_bytes <= 0
    or (p_duration_ms is not null and p_duration_ms < 0) then
    raise exception 'Invalid pronunciation upload metadata';
  end if;

  select ps.status into v_session_status
  from public.pronunciation_session_items psi
  join public.pronunciation_sessions ps on ps.id = psi.session_id
  where psi.id = p_session_item_id
    and ps.user_id = p_user_id
  for update of ps;
  if not found then
    raise exception 'Owned pronunciation session item not found';
  end if;
  select * into v_attempt
  from public.pronunciation_attempts pa
  where pa.session_item_id = p_session_item_id
    and pa.idempotency_key = p_idempotency_key;

  if v_attempt.id is not null then
    if v_attempt.storage_path <> p_storage_path
      or v_attempt.mime_type <> p_mime_type
      or v_attempt.size_bytes <> p_size_bytes
      or v_attempt.duration_ms is distinct from p_duration_ms then
      raise exception 'Idempotency key was already used with different upload metadata';
    end if;
    return query select v_attempt.id, v_attempt.status;
    return;
  end if;

  if v_session_status <> 'IN_PROGRESS' then
    raise exception 'Pronunciation session is not in progress';
  end if;

  if v_attempt.id is null then
    begin
      insert into public.pronunciation_attempts (
        id, session_item_id, storage_path, mime_type, duration_ms, size_bytes, idempotency_key
      ) values (
        p_attempt_id, p_session_item_id, p_storage_path, p_mime_type, p_duration_ms, p_size_bytes, p_idempotency_key
      ) returning * into v_attempt;
    exception when unique_violation then
      select * into v_attempt
      from public.pronunciation_attempts pa
      where pa.session_item_id = p_session_item_id
        and pa.idempotency_key = p_idempotency_key;
      if v_attempt.id is null then
        raise;
      end if;
    end;
  end if;

  if v_attempt.storage_path <> p_storage_path
    or v_attempt.mime_type <> p_mime_type
    or v_attempt.size_bytes <> p_size_bytes
    or v_attempt.duration_ms is distinct from p_duration_ms then
    raise exception 'Idempotency key was already used with different upload metadata';
  end if;

  return query select v_attempt.id, v_attempt.status;
end;
$$;

create or replace function public.complete_pronunciation_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_provider text,
  p_normalized_result jsonb,
  p_raw_result jsonb
)
returns table (
  attempt_id uuid,
  attempt_status text,
  session_id uuid,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_status text;
  v_session_id uuid;
  v_session_status text;
begin
  if p_provider is null or char_length(trim(p_provider)) = 0
    or jsonb_typeof(p_normalized_result) <> 'object'
    or jsonb_typeof(p_raw_result) <> 'object' then
    raise exception 'Invalid pronunciation provider result';
  end if;

  select pa.status, ps.id, ps.status
    into v_attempt_status, v_session_id, v_session_status
  from public.pronunciation_attempts pa
  join public.pronunciation_session_items psi on psi.id = pa.session_item_id
  join public.pronunciation_sessions ps on ps.id = psi.session_id
  where pa.id = p_attempt_id
    and ps.user_id = p_user_id
  for update of pa, ps;
  if not found then
    raise exception 'Owned pronunciation attempt not found';
  end if;

  if v_attempt_status = 'COMPLETED' then
    return query select p_attempt_id, v_attempt_status, v_session_id, v_session_status;
    return;
  end if;
  if v_attempt_status <> 'PROCESSING' then
    raise exception 'Pronunciation attempt is not processing';
  end if;

  update public.pronunciation_attempts
  set status = 'COMPLETED',
      provider = trim(p_provider),
      normalized_result = p_normalized_result,
      raw_result = p_raw_result,
      sanitized_error_code = null,
      sanitized_error_message = null,
      completed_at = now(),
      failed_at = null,
      updated_at = now()
  where id = p_attempt_id;
  v_attempt_status := 'COMPLETED';

  if not exists (
    select 1
    from public.pronunciation_session_items psi
    where psi.session_id = v_session_id
      and not exists (
        select 1
        from public.pronunciation_attempts pa
        where pa.session_item_id = psi.id
          and pa.status = 'COMPLETED'
      )
  ) then
    update public.pronunciation_sessions
    set status = 'COMPLETED',
        completed_at = coalesce(completed_at, now())
    where id = v_session_id;
    v_session_status := 'COMPLETED';
  end if;

  return query select p_attempt_id, v_attempt_status, v_session_id, v_session_status;
end;
$$;

revoke all on function public.create_pronunciation_session(uuid, uuid, text, uuid[], uuid) from public, anon, authenticated;
revoke all on function public.register_pronunciation_attempt(uuid, uuid, uuid, text, text, integer, integer, uuid) from public, anon, authenticated;
revoke all on function public.complete_pronunciation_attempt(uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function public.create_pronunciation_session(uuid, uuid, text, uuid[], uuid) to service_role;
grant execute on function public.register_pronunciation_attempt(uuid, uuid, uuid, text, text, integer, integer, uuid) to service_role;
grant execute on function public.complete_pronunciation_attempt(uuid, uuid, text, jsonb, jsonb) to service_role;
