-- Vocabulary Learning V2: let a learner skip pronouncing one word.
-- Advancing a PRONOUNCE item normally requires a COMPLETED attempt. Passing p_answer='SKIP'
-- moves on without one. The word keeps UNASSESSED pronunciation evidence, so it cannot become
-- MASTERED until a later session assesses it. Only this condition differs from 202610250001.

create or replace function public.mutate_vocabulary_learning_session(
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
    if p_stage='PRONOUNCE' and p_answer is distinct from 'SKIP' and not exists(select 1 from public.pronunciation_session_items pi
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
