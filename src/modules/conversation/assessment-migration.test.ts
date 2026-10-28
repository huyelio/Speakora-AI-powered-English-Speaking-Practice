import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202610280001_conversation_assessment_rewards.sql"), "utf8");

it("adds a fixed 25 XP role-play event without changing the practice amounts", () => {
  expect(migration).toMatch(/\(event_type = 'ANSWER' and amount = 10\)\s*or \(event_type = 'SESSION' and amount = 25\)\s*or \(event_type = 'DAILY_GOAL' and amount = 30\)\s*or \(event_type = 'FIRST_TOPIC' and amount = 20\)\s*or \(event_type = 'CONVERSATION' and amount = 25\)/);
  expect(migration).toMatch(/conversation_session_id uuid references public\.conversation_sessions\(id\) on delete set null/);
});

it("rewards once per session and shares the daily-goal key with practice", () => {
  expect(migration).toMatch(/'CONVERSATION:' \|\| s\.id::text\)\s*on conflict \(idempotency_key\) do nothing/);
  expect(migration).toMatch(/'DAILY_GOAL:' \|\| p_user_id::text \|\| ':' \|\| v_local_date::text/);
  expect(migration).toMatch(/if s\.assessment is not null then return s\.reward_xp; end if;/);
});

it("checks ownership, completion and minimum length, and caps daily credit at five", () => {
  expect(migration).toMatch(/where id = p_session_id and user_id = p_user_id for update/);
  expect(migration).toMatch(/raise exception 'NOT_ENDED'/);
  expect(migration).toMatch(/s\.user_turn_count < 3 then raise exception 'TOO_SHORT'/);
  expect(migration).toMatch(/least\(s\.user_turn_count, 5\)/);
  expect(migration).toMatch(/grant execute on function public\.save_conversation_assessment\(uuid,uuid,jsonb\) to service_role/);
});
