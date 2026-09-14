-- Vocabulary Practice MVP: content bank, sessions, self-reviews.
-- Parallel to speaking practice; does not extend practice_sessions.

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete restrict,
  word text not null,
  meaning_vi text not null,
  definition_en text,
  example_sentence text not null,
  pronunciation_ipa text,
  level text not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  source text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_items_word_nonempty check (char_length(trim(word)) > 0),
  constraint vocabulary_items_meaning_nonempty check (char_length(trim(meaning_vi)) > 0),
  constraint vocabulary_items_example_nonempty check (char_length(trim(example_sentence)) > 0),
  constraint vocabulary_items_source_ref_key unique (source, source_ref)
);

create index if not exists vocabulary_items_topic_level_active_idx
  on public.vocabulary_items (topic_id, level)
  where status = 'ACTIVE';

create table if not exists public.vocabulary_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete restrict,
  level text not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  item_count smallint not null check (item_count between 1 and 20),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint vocabulary_sessions_completed_consistency check (
    (status = 'COMPLETED' and completed_at is not null)
    or (status = 'IN_PROGRESS' and completed_at is null)
  )
);

create index if not exists vocabulary_sessions_user_created_idx
  on public.vocabulary_sessions (user_id, created_at desc);

create table if not exists public.vocabulary_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocabulary_sessions (id) on delete cascade,
  vocabulary_item_id uuid not null references public.vocabulary_items (id) on delete restrict,
  sequence_no smallint not null check (sequence_no >= 1),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_no),
  unique (session_id, vocabulary_item_id)
);

create table if not exists public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  session_item_id uuid not null unique references public.vocabulary_session_items (id) on delete cascade,
  result text not null check (result in ('REMEMBERED', 'NOT_REMEMBERED')),
  reviewed_at timestamptz not null default now()
);

alter table public.vocabulary_items enable row level security;
alter table public.vocabulary_sessions enable row level security;
alter table public.vocabulary_session_items enable row level security;
alter table public.vocabulary_reviews enable row level security;

create or replace function public.create_vocabulary_session(
  p_user_id uuid,
  p_topic_id uuid,
  p_level text,
  p_item_ids uuid[]
)
returns table(
  session_id uuid,
  session_item_id uuid,
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
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Vocabulary user does not exist';
  end if;

  if p_level is null or p_level not in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED') then
    raise exception 'Vocabulary level must be BEGINNER, INTERMEDIATE, or ADVANCED';
  end if;

  select id
    into v_general_mode_id
  from public.practice_modes
  where code = 'GENERAL' and is_active;
  if v_general_mode_id is null then
    raise exception 'General practice mode is unavailable';
  end if;

  v_item_count := array_length(p_item_ids, 1);
  if v_item_count is null
    or v_item_count < 1
    or v_item_count > 20
    or (select count(distinct item_id) from unnest(p_item_ids) as selected(item_id)) <> v_item_count then
    raise exception 'item_ids must contain between one and twenty unique vocabulary items';
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

  perform vi.id
  from public.vocabulary_items vi
  where vi.id = any(p_item_ids)
  for update of vi;

  if exists (
    select 1
    from unnest(p_item_ids) as selected(item_id)
    left join public.vocabulary_items vi
      on vi.id = selected.item_id
      and vi.topic_id = p_topic_id
      and vi.level = p_level
      and vi.status = 'ACTIVE'
    where vi.id is null
  ) then
    raise exception 'items must be active vocabulary for the requested topic and level';
  end if;

  insert into public.vocabulary_sessions(user_id, topic_id, level, item_count)
  values (p_user_id, p_topic_id, p_level, v_item_count)
  returning id into v_session_id;

  insert into public.vocabulary_session_items(session_id, vocabulary_item_id, sequence_no, snapshot)
  select
    v_session_id,
    vi.id,
    selected.sequence_no::smallint,
    jsonb_build_object(
      'word', vi.word,
      'meaning_vi', vi.meaning_vi,
      'definition_en', vi.definition_en,
      'example_sentence', vi.example_sentence,
      'pronunciation_ipa', vi.pronunciation_ipa,
      'level', vi.level,
      'first_letter_hint',
        upper(left(vi.word, 1))
        || repeat('_', greatest(char_length(regexp_replace(vi.word, '[^A-Za-z]', '', 'g')) - 1, 0))
    )
  from unnest(p_item_ids) with ordinality as selected(item_id, sequence_no)
  join public.vocabulary_items vi on vi.id = selected.item_id;

  return query
  select
    vsi.session_id,
    vsi.id,
    vsi.sequence_no,
    vsi.snapshot
  from public.vocabulary_session_items vsi
  where vsi.session_id = v_session_id
  order by vsi.sequence_no;
end;
$$;

revoke all on function public.create_vocabulary_session(uuid, uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.create_vocabulary_session(uuid, uuid, text, uuid[]) to service_role;
