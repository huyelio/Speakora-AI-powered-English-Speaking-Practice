drop function if exists public.create_ielts_practice_session(text, integer);

create or replace function public.create_ielts_practice_session(p_token_hash text, p_question_ids uuid[])
returns table(session_id uuid, session_question_id uuid, sequence_no smallint, prompt_snapshot jsonb)
language plpgsql security definer set search_path=public as $$
declare v_session_id uuid;
begin
  if array_length(p_question_ids, 1) <> 5 or (select count(distinct question_id) from unnest(p_question_ids) as selected(question_id)) <> 5 then
    raise exception 'question_ids must contain five unique questions';
  end if;
  perform q.id
  from questions q
  join practice_modes pm on pm.id=q.mode_id
  join question_types qt on qt.id=q.question_type_id
  where q.id=any(p_question_ids)
  for update of q,pm,qt;
  if exists (
    select 1 from unnest(p_question_ids) with ordinality selected(question_id, sequence_no)
    left join questions q on q.id=selected.question_id and q.status='ACTIVE'
    left join practice_modes pm on pm.id=q.mode_id and pm.code='IELTS' and pm.is_active
    left join question_types qt on qt.id=q.question_type_id
    where q.id is null or pm.id is null or qt.code<>(array['IELTS_PART_1','IELTS_PART_1','IELTS_PART_2_CUE_CARD','IELTS_PART_3','IELTS_PART_3'])[selected.sequence_no::integer]
  ) then raise exception 'questions must be active IELTS questions in 2/1/2 order'; end if;

  insert into practice_sessions(mode,guest_token_hash,question_count) values('IELTS',p_token_hash,5) returning id into v_session_id;
  insert into session_questions(session_id,question_id,question_version,sequence_no,prompt_snapshot)
  select v_session_id,q.id,q.version,selected.sequence_no::smallint,
    jsonb_build_object('id',q.id,'code',q.code,'prompt_text',q.prompt_text,'instruction_text',q.instruction_text,
      'prep_seconds',coalesce(q.prep_seconds,qt.default_prep_seconds),'answer_seconds',coalesce(q.answer_seconds,qt.default_answer_seconds),
      'question_type',qt.code,'topic',case when t.id is null then null else jsonb_build_object('slug',t.slug,'name',t.name) end,
      'prompt_items',coalesce((select jsonb_agg(jsonb_build_object('content',i.content,'sequence_no',i.sequence_no) order by i.sequence_no) from question_prompt_items i where i.question_id=q.id),'[]'::jsonb))
  from unnest(p_question_ids) with ordinality selected(question_id,sequence_no)
  join questions q on q.id=selected.question_id join question_types qt on qt.id=q.question_type_id left join topics t on t.id=q.topic_id;
  return query select sq.session_id,sq.id,sq.sequence_no,sq.prompt_snapshot from session_questions sq where sq.session_id=v_session_id order by sq.sequence_no;
end $$;

revoke all on function public.create_ielts_practice_session(text,uuid[]) from public,anon,authenticated;
grant execute on function public.create_ielts_practice_session(text,uuid[]) to service_role;
