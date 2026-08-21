import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608210002_learner_onboarding_rpc.sql"),
  "utf8",
);

describe("learner onboarding RPC migration", () => {
  it("removes direct authenticated profile and goal updates while retaining RPC access", () => {
    expect(migration).toMatch(
      /drop policy if exists "Learners can update own profile" on public\.profiles;/,
    );
    expect(migration).toMatch(
      /drop policy if exists "Learners can update own learning goal" on public\.learning_goals;/,
    );
    expect(migration).toMatch(
      /revoke update on table public\.profiles, public\.learning_goals from authenticated;/,
    );
    expect(migration).toMatch(/security definer/);
    expect(migration).toMatch(
      /grant execute on function public\.upsert_learner_onboarding\(uuid, text, text, text, text, integer\)\s*to authenticated;/,
    );
  });
});
