import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202608210006_learner_xp_total.sql",
);

describe("learner XP total migration", () => {
  it("aggregates the learner ledger in PostgreSQL and restricts execution to the service role", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/returns bigint[\s\S]*coalesce\(sum\(amount\), 0\)::bigint[\s\S]*where user_id = p_user_id/i);
    expect(migration).toMatch(/revoke all on function public\.get_learner_xp_total\(uuid\) from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.get_learner_xp_total\(uuid\) to service_role/i);
  });

  it("indexes the owned history tuple used by cursor pagination", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /create index if not exists practice_sessions_user_created_id_idx[\s\S]*on public\.practice_sessions\(user_id, created_at desc, id desc\)[\s\S]*where user_id is not null/i,
    );
  });

  it("snapshots the daily target and uses that snapshot when progress increments", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/alter table public\.daily_progress[\s\S]*add column if not exists daily_answer_target integer/i);
    expect(migration).toMatch(/insert into public\.daily_progress\(user_id, local_date, completed_answers, daily_answer_target\)/i);
    expect(migration).toMatch(/returning completed_answers, goal_achieved_at, daily_answer_target[\s\S]*into v_completed_answers, v_goal_achieved_at, v_target/i);
  });

  it("backfills only today's active progress snapshot during migration", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/update public\.daily_progress dp[\s\S]*set daily_answer_target = g\.daily_answer_target[\s\S]*dp\.local_date = \(now\(\) at time zone p\.timezone\)::date/i);
  });

  it("returns bounded per-topic history aggregates for availability and recommendations", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/function public\.get_learner_topic_history\(p_user_id uuid\)[\s\S]*group by ps\.topic_id/i);
    expect(migration).toMatch(/returns table\s*\(\s*topic_id uuid,\s*practiced_count bigint,\s*last_practiced_at timestamptz/i);
    expect(migration).toMatch(/grant execute on function public\.get_learner_topic_history\(uuid\) to service_role/i);
  });

  it("returns grouped active General topic availability", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/function public\.get_general_topic_availability\(\)[\s\S]*group by t\.id, t\.slug, t\.name, q\.difficulty_level/i);
    expect(migration).toMatch(/grant execute on function public\.get_general_topic_availability\(\) to service_role/i);
  });
});
