-- Validate goals against the immutable scenario snapshot; preserve the existing lease and RPC contract.
begin;

create or replace function public.advance_conversation_turn(p_session_id uuid, p_user_id uuid, p_token uuid, p_action text,
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
    if jsonb_typeof(p_goals) <> 'array' or exists(select 1 from jsonb_array_elements_text(p_goals) g where not exists (select 1 from jsonb_array_elements(s.scenario_snapshot->'goals') goal where goal->>'id' = g)) then raise exception 'INVALID_GOALS'; end if;
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


commit;

