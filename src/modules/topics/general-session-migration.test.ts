import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608210003_general_practice_sessions.sql"),
  "utf8",
);

describe("General practice session RPC migration", () => {
  it("creates a service-role-only security-definer RPC with five-question validation", () => {
    expect(migration).toMatch(/create or replace function public\.create_general_practice_session\([\s\S]*p_user_id uuid,[\s\S]*p_topic_id uuid,[\s\S]*p_difficulty text,[\s\S]*p_question_ids uuid\[\][\s\S]*\)/);
    expect(migration).toMatch(/security definer/);
    expect(migration).toMatch(/array_length\(p_question_ids, 1\) <> 5/);
    expect(migration).toMatch(/count\(distinct question_id\)[\s\S]*<> 5/);
    expect(migration).toMatch(/from auth\.users where id = p_user_id/);
    expect(migration).toMatch(/pm\.code = 'GENERAL' and pm\.is_active/);
    expect(migration).toMatch(/q\.topic_id = p_topic_id/);
    expect(migration).toMatch(/q\.difficulty_level = p_difficulty/);
    expect(migration).toMatch(/insert into public\.practice_sessions\(user_id, topic_id, mode, difficulty_level, question_count\)/);
    expect(migration).toMatch(/insert into public\.session_questions/);
    expect(migration).toMatch(/revoke all on function public\.create_general_practice_session\(uuid,uuid,text,uuid\[\]\) from public,anon,authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.create_general_practice_session\(uuid,uuid,text,uuid\[\]\) to service_role;/);
  });
});
