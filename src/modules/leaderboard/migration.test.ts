import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202610280002_weekly_leaderboard.sql"), "utf8");

it("ranks weekly XP from Monday in Vietnam time, opt-out and without user IDs", () => {
  expect(migration).toMatch(/add column show_on_leaderboard boolean not null default true/);
  expect(migration).toMatch(/date_trunc\('week', now\(\) at time zone 'Asia\/Ho_Chi_Minh'\)/);
  expect(migration).toMatch(/where p\.show_on_leaderboard and t\.xp > 0/);
  const returns = migration.match(/returns table \(([\s\S]*?)\)\s*language/)![1];
  expect(returns).not.toMatch(/user_id/);
  expect(migration).toMatch(/grant execute on function public\.get_weekly_leaderboard\(uuid, integer\) to service_role/);
  expect(migration).toMatch(/revoke all on function public\.get_weekly_leaderboard\(uuid, integer\) from public, anon, authenticated/);
});
