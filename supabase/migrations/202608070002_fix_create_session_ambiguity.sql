create or replace function public.create_ielts_practice_session(p_token_hash text, p_question_count integer default 5)
returns table(session_id uuid, session_question_id uuid, sequence_no smallint, prompt_snapshot jsonb)
language plpgsql security definer set search_path=public as $$
declare v_session_id uuid;
begin
  if p_question_count <> 5 then raise exception 'question_count must be 5'; end if;

  insert into practice_sessions(mode, guest_token_hash, question_count)
  values ('IELTS', p_token_hash, 5)
  returning id into v_session_id;

  insert into session_questions(session_id, question_id, question_version, sequence_no, prompt_snapshot)
  select v_session_id, q.id, q.version, row_number() over ()::smallint,
    jsonb_build_object(
      'id', q.id,
      'code', q.code,
      'prompt_text', q.prompt_text,
      'instruction_text', q.instruction_text,
      'prep_seconds', coalesce(q.prep_seconds, qt.default_prep_seconds),
      'answer_seconds', coalesce(q.answer_seconds, qt.default_answer_seconds),
      'question_type', qt.code,
      'topic', case when t.id is null then null else jsonb_build_object('slug', t.slug, 'name', t.name) end,
      'prompt_items', coalesce((
        select jsonb_agg(
          jsonb_build_object('content', i.content, 'sequence_no', i.sequence_no)
          order by i.sequence_no
        )
        from question_prompt_items i
        where i.question_id = q.id
      ), '[]'::jsonb)
    )
  from (
    select source_q.*
    from questions source_q
    join practice_modes pm on pm.id = source_q.mode_id
    where pm.code = 'IELTS'
      and pm.is_active
      and source_q.status = 'ACTIVE'
    order by random()
    limit 5
  ) q
  join question_types qt on qt.id = q.question_type_id
  left join topics t on t.id = q.topic_id;

  if (
    select count(*)
    from session_questions sq_count
    where sq_count.session_id = v_session_id
  ) <> 5 then
    raise exception 'Not enough active IELTS questions';
  end if;

  return query
  select sq.session_id, sq.id, sq.sequence_no, sq.prompt_snapshot
  from session_questions sq
  where sq.session_id = v_session_id
  order by sq.sequence_no;
end $$;

revoke all on function public.create_ielts_practice_session(text,integer) from public, anon, authenticated;
grant execute on function public.create_ielts_practice_session(text,integer) to service_role;
