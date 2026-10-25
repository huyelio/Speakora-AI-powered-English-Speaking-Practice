-- Additive orchestration over the existing vocabulary and pronunciation domains.
alter table public.vocabulary_sessions
  add column session_kind text not null default 'FLASHCARD' check (session_kind in ('FLASHCARD','LEARNING_V2')),
  add column pronunciation_session_id uuid unique references public.pronunciation_sessions(id) on delete restrict,
  add column learning_stage text check (learning_stage in ('LEARN','PRONOUNCE','RECALL','CONTEXT','SUMMARY')),
  add column learning_cursor integer not null default 0 check (learning_cursor >= 0),
  add column creation_request_id uuid,
  add column learning_metadata jsonb not null default '{}'::jsonb,
  add constraint vocabulary_learning_request_unique unique(user_id, creation_request_id),
  add constraint vocabulary_learning_shape check (
    (session_kind='FLASHCARD' and learning_stage is null and pronunciation_session_id is null)
    or (session_kind='LEARNING_V2' and learning_stage is not null and pronunciation_session_id is not null
      and creation_request_id is not null
      and ((learning_stage='SUMMARY' and status='COMPLETED') or (learning_stage<>'SUMMARY' and status='IN_PROGRESS')))
  );
alter table public.vocabulary_reviews
  add column context_result text check(context_result in ('REMEMBERED','NOT_REMEMBERED')),
  add column context_reviewed_at timestamptz,
  add constraint vocabulary_context_consistency check ((context_result is null) = (context_reviewed_at is null));
create index vocabulary_learning_item_history_idx on public.vocabulary_session_items(vocabulary_item_id,session_id);
create index pronunciation_learning_item_history_idx on public.pronunciation_session_items(vocabulary_item_id,session_id);

-- UNKNOWN is distinct from an evaluated weak pronunciation. Missing data never grants mastery.
create function public.vocabulary_learning_pronunciation_state(p_result jsonb) returns text
language plpgsql immutable set search_path=public as $$
begin
  if p_result is null then return 'UNASSESSED'; end if;
  if jsonb_typeof(p_result->'overall'->'accuracy') is distinct from 'number'
    or jsonb_typeof(p_result->'words') is distinct from 'array' then return 'UNKNOWN'; end if;
  if jsonb_array_length(p_result->'words')=0 then return 'UNKNOWN'; end if;
  if exists(select 1 from jsonb_array_elements(p_result->'words') w
    where jsonb_typeof(w->'syllables') is distinct from 'array') then return 'UNKNOWN'; end if;
  if exists(select 1 from jsonb_array_elements(p_result->'words') w where jsonb_array_length(w->'syllables')=0)
    or exists(select 1 from jsonb_array_elements(p_result->'words') w,
      lateral jsonb_array_elements(w->'syllables') s
      where jsonb_typeof(s->'accuracy') is distinct from 'number'
        or jsonb_typeof(s->'isMissing') is distinct from 'boolean'
        or jsonb_typeof(s->'isExtra') is distinct from 'boolean') then return 'UNKNOWN'; end if;
  if jsonb_path_exists(p_result,'$.overall.accuracy ? (@ < 0 || @ > 100)')
    or jsonb_path_exists(p_result,'$.words[*].syllables[*].accuracy ? (@ < 0 || @ > 100)') then return 'UNKNOWN'; end if;
  if jsonb_path_exists(p_result,'$.overall.accuracy ? (@ < 80)')
    or jsonb_path_exists(p_result,'$.words[*].syllables[*] ? (@.accuracy < 70 || @.isMissing == true || @.isExtra == true)') then return 'WEAK'; end if;
  return 'GOOD';
end $$;

-- One JSON response, aggregated in PostgreSQL, without REST row-limit truncation.
create function public.get_vocabulary_learning_history(p_user_id uuid,p_item_ids uuid[]) returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(ids.id::text,jsonb_build_object(
    'latestReview',rv.result,'recalls',coalesce(recent.results,'[]'::jsonb),
    'pronunciation',public.vocabulary_learning_pronunciation_state(pa.normalized_result),
    'lastPracticedAt',greatest(rv.reviewed_at,pa.completed_at)
  )),'{}'::jsonb)
  from (select distinct unnest(p_item_ids) id) ids
  left join lateral (
    select r.result,r.reviewed_at from public.vocabulary_reviews r
    join public.vocabulary_session_items i on i.id=r.session_item_id
    join public.vocabulary_sessions s on s.id=i.session_id
    where i.vocabulary_item_id=ids.id and s.user_id=p_user_id
    order by r.reviewed_at desc,r.id desc limit 1
  ) rv on true
  left join lateral (
    select jsonb_agg(t.result='REMEMBERED' order by t.reviewed_at desc,t.id desc) results from (
      select r.result,r.reviewed_at,r.id from public.vocabulary_reviews r
      join public.vocabulary_session_items i on i.id=r.session_item_id
      join public.vocabulary_sessions s on s.id=i.session_id
      where i.vocabulary_item_id=ids.id and s.user_id=p_user_id and s.session_kind='LEARNING_V2'
      order by r.reviewed_at desc,r.id desc limit 2
    ) t
  ) recent on true
  left join lateral (
    select a.normalized_result,a.completed_at from public.pronunciation_attempts a
    join public.pronunciation_session_items i on i.id=a.session_item_id
    join public.pronunciation_sessions s on s.id=i.session_id
    where i.vocabulary_item_id=ids.id and s.user_id=p_user_id and a.status='COMPLETED'
    order by a.completed_at desc,a.id desc limit 1
  ) pa on true;
$$;

create function public.vocabulary_learning_state(p_evidence jsonb) returns text
language sql immutable set search_path=public as $$
  select case
    when p_evidence->>'latestReview'='NOT_REMEMBERED' or p_evidence->>'pronunciation'='WEAK' then 'WEAK'
    when p_evidence->'recalls'->>0='true' and p_evidence->'recalls'->>1='true'
      and p_evidence->>'pronunciation'='GOOD' then 'MASTERED'
    when p_evidence->>'latestReview' is null and coalesce(jsonb_array_length(p_evidence->'recalls'),0)=0
      and p_evidence->>'pronunciation'='UNASSESSED' then 'NEW'
    else 'LEARNING' end;
$$;

create function public.get_vocabulary_learning_candidates(p_user_id uuid,p_topic_id uuid,p_level text) returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'word',v.word,'example',v.example_sentence,
    'evidence',h.evidence->v.id::text) order by v.id),'[]'::jsonb)
  from public.vocabulary_items v
  join public.topics t on t.id=v.topic_id and t.is_active
  join public.practice_modes m on m.id=t.mode_id and m.code='GENERAL' and m.is_active
  cross join lateral (select public.get_vocabulary_learning_history(p_user_id,array[v.id]) evidence) h
  where v.topic_id=p_topic_id and v.level=p_level and v.status='ACTIVE' and nullif(trim(v.pronunciation_ipa),'') is not null;
$$;

create function public.create_vocabulary_learning_session(
  p_user_id uuid,p_topic_id uuid,p_level text,p_request_id uuid,p_item_ids uuid[],p_context_prompts jsonb,
  p_source_session_id uuid default null,p_mastered_only boolean default false
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_session uuid; v_pronunciation uuid; v_existing public.vocabulary_sessions%rowtype;
  v_source public.vocabulary_sessions%rowtype; v_history jsonb; v_id uuid;
begin
  if p_request_id is null or p_mastered_only is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select * into v_existing from public.vocabulary_sessions where user_id=p_user_id and creation_request_id=p_request_id;
  if found then
    if v_existing.topic_id<>p_topic_id or v_existing.level<>p_level
      or (v_existing.learning_metadata->>'sourceSessionId') is distinct from p_source_session_id::text
      or (v_existing.learning_metadata->>'masteredOnly')::boolean is distinct from p_mastered_only then
      raise exception 'REQUEST_CONFLICT';
    end if;
    return v_existing.id;
  end if;
  if coalesce(cardinality(p_item_ids),0) not between 1 and 6 then raise exception 'INVALID_ITEMS'; end if;
  if p_source_session_id is not null then
    select * into v_source from public.vocabulary_sessions where id=p_source_session_id and user_id=p_user_id
      and session_kind='LEARNING_V2' and status='COMPLETED';
    if not found or v_source.topic_id<>p_topic_id or v_source.level<>p_level or p_mastered_only then raise exception 'INVALID_SOURCE'; end if;
    if exists(select 1 from unnest(p_item_ids) x where not exists(select 1 from public.vocabulary_session_items i
      where i.session_id=p_source_session_id and i.vocabulary_item_id=x)) then raise exception 'INVALID_SOURCE_ITEMS'; end if;
  end if;
  v_history:=public.get_vocabulary_learning_history(p_user_id,p_item_ids);
  foreach v_id in array p_item_ids loop
    if p_source_session_id is not null and public.vocabulary_learning_state(v_history->v_id::text)<>'WEAK'
      then raise exception 'NO_WEAK_ITEMS'; end if;
    if p_source_session_id is null and (public.vocabulary_learning_state(v_history->v_id::text)='MASTERED')<>p_mastered_only
      then raise exception 'SELECTION_CHANGED'; end if;
  end loop;
  select r.session_id into v_session from public.create_vocabulary_session(p_user_id,p_topic_id,p_level,p_item_ids) r limit 1;
  select r.session_id into v_pronunciation from public.create_pronunciation_session(p_user_id,p_topic_id,p_level,p_item_ids,null) r limit 1;
  update public.vocabulary_sessions set session_kind='LEARNING_V2',pronunciation_session_id=v_pronunciation,
    learning_stage='LEARN',creation_request_id=p_request_id,
    learning_metadata=jsonb_build_object('contextItemIds','[]'::jsonb,'sourceSessionId',p_source_session_id,'masteredOnly',p_mastered_only)
    where id=v_session;
  update public.vocabulary_session_items i set snapshot=i.snapshot || jsonb_build_object(
    'initial_learning_state',public.vocabulary_learning_state(v_history->i.vocabulary_item_id::text),
    'initial_evidence',v_history->i.vocabulary_item_id::text,
    'context_prompt',p_context_prompts->i.vocabulary_item_id::text) where i.session_id=v_session;
  return v_session;
end $$;

-- Server-only orchestration; stage/cursor preconditions make repeated requests harmless.
create function public.mutate_vocabulary_learning_session(
  p_session_id uuid,p_user_id uuid,p_action text,p_stage text,p_item_id uuid,p_answer text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  s public.vocabulary_sessions%rowtype; i public.vocabulary_session_items%rowtype;
  r public.vocabulary_reviews%rowtype; v_result text; v_context jsonb; v_expected uuid;
begin
  select * into s from public.vocabulary_sessions where id=p_session_id and user_id=p_user_id and session_kind='LEARNING_V2' for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  select * into i from public.vocabulary_session_items where id=p_item_id and session_id=s.id;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if p_action='advance' and p_stage in ('LEARN','PRONOUNCE') then
    if (p_stage='LEARN' and s.learning_stage<>'LEARN') or
      (p_stage='PRONOUNCE' and s.learning_stage in ('RECALL','CONTEXT','SUMMARY'))
      or (s.learning_stage=p_stage and i.sequence_no-1<s.learning_cursor) then return '{}'::jsonb; end if;
    if s.learning_stage<>p_stage or i.sequence_no-1<>s.learning_cursor then raise exception 'STAGE_CONFLICT'; end if;
    if p_stage='PRONOUNCE' and not exists(select 1 from public.pronunciation_session_items pi
      join public.pronunciation_attempts a on a.session_item_id=pi.id and a.status='COMPLETED'
      where pi.session_id=s.pronunciation_session_id and pi.vocabulary_item_id=i.vocabulary_item_id)
      then raise exception 'PRONUNCIATION_PENDING'; end if;
    update public.vocabulary_sessions set learning_cursor=case when s.learning_cursor+1=s.item_count then 0 else s.learning_cursor+1 end,
      learning_stage=case when s.learning_cursor+1<s.item_count then p_stage when p_stage='LEARN' then 'PRONOUNCE' else 'RECALL' end
      where id=s.id;
    return '{}'::jsonb;
  end if;
  if p_action is distinct from 'answer' or p_stage is null or p_stage not in ('RECALL','CONTEXT')
    or p_answer is null or char_length(p_answer)>200 then raise exception 'INVALID_ANSWER'; end if;
  select * into r from public.vocabulary_reviews where session_item_id=i.id;
  v_result:=case when p_stage='RECALL' then r.result else r.context_result end;
  if v_result is not null then return jsonb_build_object('correct',v_result='REMEMBERED','word',i.snapshot->>'word'); end if;
  if s.learning_stage<>p_stage then raise exception 'STAGE_CONFLICT'; end if;
  if p_stage='RECALL' then
    if i.sequence_no-1<>s.learning_cursor then raise exception 'STAGE_CONFLICT'; end if;
  else
    v_expected:=(s.learning_metadata->'contextItemIds'->>s.learning_cursor)::uuid;
    if v_expected is distinct from i.id then raise exception 'STAGE_CONFLICT'; end if;
  end if;
  v_result:=case when p_answer=lower(regexp_replace(i.snapshot->>'word','^\s+|\s+$','','g')) then 'REMEMBERED' else 'NOT_REMEMBERED' end;
  if p_stage='RECALL' then
    insert into public.vocabulary_reviews(session_item_id,result) values(i.id,v_result);
    if s.learning_cursor+1=s.item_count then
      select coalesce(jsonb_agg(c.id order by c.priority,c.sequence_no),'[]'::jsonb) into v_context from (
        select si.id,si.sequence_no,case when vr.result='NOT_REMEMBERED' then 0
          when public.vocabulary_learning_pronunciation_state(pa.normalized_result)='WEAK' then 1 else 2 end priority
        from public.vocabulary_session_items si
        join public.vocabulary_reviews vr on vr.session_item_id=si.id
        left join public.pronunciation_session_items pi on pi.session_id=s.pronunciation_session_id and pi.vocabulary_item_id=si.vocabulary_item_id
        left join lateral (select a.normalized_result from public.pronunciation_attempts a where a.session_item_id=pi.id and a.status='COMPLETED'
          order by a.completed_at desc,a.id desc limit 1) pa on true
        where si.session_id=s.id and nullif(si.snapshot->>'context_prompt','') is not null
        order by priority,si.sequence_no limit 3
      ) c;
      update public.vocabulary_sessions set learning_cursor=0,
        learning_metadata=jsonb_set(learning_metadata,'{contextItemIds}',v_context),
        learning_stage=case when jsonb_array_length(v_context)=0 then 'SUMMARY' else 'CONTEXT' end,
        status=case when jsonb_array_length(v_context)=0 then 'COMPLETED' else 'IN_PROGRESS' end,
        completed_at=case when jsonb_array_length(v_context)=0 then now() else null end where id=s.id;
    else
      update public.vocabulary_sessions set learning_cursor=learning_cursor+1 where id=s.id;
    end if;
  else
    update public.vocabulary_reviews set context_result=v_result,context_reviewed_at=now() where session_item_id=i.id;
    if s.learning_cursor+1=jsonb_array_length(s.learning_metadata->'contextItemIds') then
      update public.vocabulary_sessions set learning_stage='SUMMARY',learning_cursor=0,status='COMPLETED',completed_at=now() where id=s.id;
    else
      update public.vocabulary_sessions set learning_cursor=learning_cursor+1 where id=s.id;
    end if;
  end if;
  return jsonb_build_object('correct',v_result='REMEMBERED','word',i.snapshot->>'word');
end $$;

revoke all on function public.get_vocabulary_learning_history(uuid,uuid[]) from public,anon,authenticated;
revoke all on function public.get_vocabulary_learning_candidates(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_vocabulary_learning_session(uuid,uuid,text,uuid,uuid[],jsonb,uuid,boolean) from public,anon,authenticated;
revoke all on function public.mutate_vocabulary_learning_session(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
revoke all on function public.vocabulary_learning_pronunciation_state(jsonb) from public,anon,authenticated;
revoke all on function public.vocabulary_learning_state(jsonb) from public,anon,authenticated;
grant execute on function public.get_vocabulary_learning_history(uuid,uuid[]) to service_role;
grant execute on function public.get_vocabulary_learning_candidates(uuid,uuid,text) to service_role;
grant execute on function public.create_vocabulary_learning_session(uuid,uuid,text,uuid,uuid[],jsonb,uuid,boolean) to service_role;
grant execute on function public.mutate_vocabulary_learning_session(uuid,uuid,text,text,uuid,text) to service_role;
grant execute on function public.vocabulary_learning_pronunciation_state(jsonb) to service_role;
grant execute on function public.vocabulary_learning_state(jsonb) to service_role;
