-- Additive experimental role-play. Existing Topic Speaking tables are untouched.
begin;

create table public.conversation_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_key text not null,
  scenario_snapshot jsonb not null check (jsonb_typeof(scenario_snapshot) = 'object'),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  user_turn_count integer not null default 0 check (user_turn_count >= 0),
  completed_goals jsonb not null default '[]'::jsonb check (jsonb_typeof(completed_goals) = 'array'),
  pending_message_id uuid,
  processing_token uuid,
  processing_until timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index conversation_sessions_owner_idx on public.conversation_sessions(user_id, created_at desc);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  audio_path text,
  turn_index integer not null check (turn_index >= 0),
  processing_status text not null default 'PENDING' check (processing_status in ('PENDING', 'TRANSCRIBED', 'COMPLETED')),
  completed_goals jsonb not null default '[]'::jsonb check (jsonb_typeof(completed_goals) = 'array'),
  created_at timestamptz not null default now(),
  unique(session_id, turn_index)
);
-- User-message UUID doubles as its idempotency key. No new Storage bucket.
alter table public.conversation_sessions enable row level security;
alter table public.conversation_messages enable row level security;
revoke all on public.conversation_sessions, public.conversation_messages from anon, authenticated;
grant select on public.conversation_sessions, public.conversation_messages to authenticated;
grant all on public.conversation_sessions, public.conversation_messages to service_role;
create policy conversation_sessions_owner_read on public.conversation_sessions for select to authenticated using (user_id = auth.uid());
create policy conversation_messages_owner_read on public.conversation_messages for select to authenticated using (
  exists (select 1 from public.conversation_sessions s where s.id = session_id and s.user_id = auth.uid())
);

create function public.create_conversation_session(p_id uuid, p_user_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into conversation_sessions(id, user_id, scenario_key, scenario_snapshot)
    values(p_id, p_user_id, p_snapshot->>'key', p_snapshot) on conflict(id) do nothing;
  if not exists(select 1 from conversation_sessions where id = p_id and user_id = p_user_id) then raise exception 'NOT_FOUND'; end if;
  insert into conversation_messages(session_id, role, content, turn_index, processing_status)
    values(p_id, 'assistant', p_snapshot->>'opening', 0, 'COMPLETED') on conflict(session_id, turn_index) do nothing;
end $$;

-- Serialize turns across tabs/requests, allow retries, and fence stale processors.
create function public.claim_conversation_turn(p_session_id uuid, p_user_id uuid, p_message_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s conversation_sessions; m conversation_messages; next_index integer;
begin
  select * into s from conversation_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into m from conversation_messages where id = p_message_id and session_id = p_session_id and role = 'user';
  if found and m.processing_status = 'COMPLETED' then return to_jsonb(m); end if;
  if s.status <> 'IN_PROGRESS' then raise exception 'SESSION_ENDED'; end if;
  if s.processing_until > now() then raise exception 'TURN_BUSY'; end if;
  if s.pending_message_id is not null and s.pending_message_id <> p_message_id then raise exception 'PENDING_TURN'; end if;
  if m.id is null then
    if s.user_turn_count >= 40 then raise exception 'TURN_LIMIT'; end if;
    select coalesce(max(turn_index), 0) + 1 into next_index from conversation_messages where session_id = p_session_id;
    insert into conversation_messages(id, session_id, role, turn_index) values(p_message_id, p_session_id, 'user', next_index) returning * into m;
  end if;
  update conversation_sessions set pending_message_id = p_message_id, processing_token = p_token, processing_until = now() + interval '3 minutes' where id = p_session_id;
  return to_jsonb(m);
end $$;

-- Every state update is atomic and requires the current processing lease token.
create function public.advance_conversation_turn(p_session_id uuid, p_user_id uuid, p_token uuid, p_action text,
  p_content text default null, p_audio_path text default null, p_goals jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s conversation_sessions; m conversation_messages; merged jsonb;
begin
  select * into s from conversation_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if s.processing_token is distinct from p_token or s.status <> 'IN_PROGRESS' then raise exception 'STALE_TURN'; end if;
  select * into m from conversation_messages where id = s.pending_message_id and session_id = s.id;
  if p_action = 'AUDIO' then
    update conversation_messages set audio_path = p_audio_path where id = m.id;
    return;
  elsif p_action = 'TRANSCRIPT' then
    if p_content is null or char_length(trim(p_content)) = 0 or char_length(p_content) > 4000 then raise exception 'INVALID_TRANSCRIPT'; end if;
    if m.processing_status = 'PENDING' then
      update conversation_messages set content = p_content, processing_status = 'TRANSCRIBED' where id = m.id;
      update conversation_sessions set user_turn_count = user_turn_count + 1 where id = s.id;
    end if;
  elsif p_action = 'REPLY' then
    if m.processing_status <> 'TRANSCRIBED' then raise exception 'NO_TRANSCRIPT'; end if;
    if p_content is null or char_length(trim(p_content)) = 0 or char_length(p_content) > 1000 then raise exception 'INVALID_REPLY'; end if;
    if jsonb_typeof(p_goals) <> 'array' or exists(select 1 from jsonb_array_elements_text(p_goals) g where g not in ('destination_reason', 'looking_forward')) then raise exception 'INVALID_GOALS'; end if;
    select coalesce(jsonb_agg(g order by g), '[]'::jsonb) into merged from (
      select distinct jsonb_array_elements_text(s.completed_goals || p_goals) as g
    ) goals;
    insert into conversation_messages(session_id, role, content, turn_index, processing_status, completed_goals)
      values(s.id, 'assistant', p_content, m.turn_index + 1, 'COMPLETED', merged);
    update conversation_messages set processing_status = 'COMPLETED' where id = m.id;
    update conversation_sessions set completed_goals = merged, pending_message_id = null where id = s.id;
  elsif p_action <> 'RELEASE' then
    raise exception 'INVALID_ACTION';
  end if;
  update conversation_sessions set processing_token = null, processing_until = null where id = s.id;
end $$;

create function public.end_conversation_session(p_session_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s conversation_sessions;
begin
  select * into s from conversation_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if s.processing_until > now() then raise exception 'TURN_BUSY'; end if;
  update conversation_sessions set status = 'COMPLETED', completed_at = coalesce(completed_at, now()), processing_token = null, processing_until = null where id = s.id;
end $$;

revoke all on function public.create_conversation_session(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.claim_conversation_turn(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.advance_conversation_turn(uuid,uuid,uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.end_conversation_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_conversation_session(uuid,uuid,jsonb) to service_role;
grant execute on function public.claim_conversation_turn(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.advance_conversation_turn(uuid,uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.end_conversation_session(uuid,uuid) to service_role;
commit;
