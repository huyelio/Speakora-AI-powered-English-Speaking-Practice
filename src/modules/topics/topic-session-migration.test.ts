import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609120001_topic_practice_question_count.sql"),
  "utf8",
);

describe("topic practice session migration", () => {
  it("relaxes session size constraints and replaces the General create RPC", () => {
    expect(migration).toMatch(/drop constraint if exists practice_sessions_question_count_check/);
    expect(migration).toMatch(/check \(question_count between 1 and 20\)/);
    expect(migration).toMatch(/drop constraint if exists session_questions_sequence_no_check/);
    expect(migration).toMatch(/check \(sequence_no >= 1\)/);
    expect(migration).toMatch(/add column if not exists difficulty_level text check/);
    expect(migration).toMatch(/drop function if exists public\.create_general_practice_session\(uuid, uuid, text, uuid\[\]\)/);
    expect(migration).toMatch(/create or replace function public\.create_general_practice_session\([\s\S]*p_user_id uuid,[\s\S]*p_topic_id uuid,[\s\S]*p_question_ids uuid\[\][\s\S]*\)/);
    expect(migration).toMatch(/security definer/);
    expect(migration).toMatch(/v_question_count := array_length\(p_question_ids, 1\)/);
    expect(migration).toMatch(/q\.topic_id = p_topic_id/);
    expect(migration).not.toMatch(/q\.difficulty_level = p_difficulty/);
    expect(migration).toMatch(/insert into public\.practice_sessions\(user_id, topic_id, mode, difficulty_level, question_count\)/);
    expect(migration).toMatch(/revoke all on function public\.create_general_practice_session\(uuid, uuid, uuid\[\]\) from public,\s*anon,\s*authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.create_general_practice_session\(uuid, uuid, uuid\[\]\) to service_role;/);
  });
});
