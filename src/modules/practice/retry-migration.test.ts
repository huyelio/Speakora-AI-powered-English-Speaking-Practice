import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202608210004_retry_failed_jobs_atomic.sql",
);

describe("atomic failed-job retry migration", () => {
  it("locks an eligible failed session and repairs jobs, answers, and session atomically", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

    expect(migration).toMatch(
      /create or replace function public\.retry_failed_processing_jobs\(p_session_id uuid\)[\s\S]*returns integer/,
    );
    expect(migration).toMatch(
      /from public\.practice_sessions[\s\S]*where id = p_session_id[\s\S]*for update/,
    );
    expect(migration).toMatch(/if v_session_status <> 'FAILED' then[\s\S]*return 0/);
    expect(migration).toMatch(
      /update public\.processing_jobs[\s\S]*where session_id = p_session_id[\s\S]*and status = 'FAILED'/,
    );
    expect(migration).toMatch(
      /update public\.user_answers[\s\S]*and status = 'FAILED'/,
    );
    expect(migration).toMatch(
      /if v_retry_count > 0 then[\s\S]*update public\.practice_sessions[\s\S]*set status = 'PROCESSING'/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.retry_failed_processing_jobs\(uuid\) from public, anon, authenticated;/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.retry_failed_processing_jobs\(uuid\) to service_role;/,
    );
  });
});
