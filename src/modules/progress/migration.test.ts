import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608210001_learning_profiles_progress.sql"),
  "utf8",
);

describe("learning profile progress migration", () => {
  it("derives an answer's local progress date from its registration timestamp", () => {
    expect(migration).toMatch(/v_registered_at\s+timestamptz/);
    expect(migration).toMatch(/a\.created_at/);
    expect(migration).toMatch(
      /v_local_date\s*:=\s*\(v_registered_at at time zone v_timezone\)::date/,
    );
  });

  it("allows only the fixed XP amount for each event type", () => {
    expect(migration).toMatch(
      /check\s*\(\s*\(event_type = 'ANSWER' and amount = 10\)\s*or\s*\(event_type = 'SESSION' and amount = 25\)\s*or\s*\(event_type = 'DAILY_GOAL' and amount = 30\)\s*or\s*\(event_type = 'FIRST_TOPIC' and amount = 20\)\s*\)/,
    );
  });
});
