# Task 1 Report: Learning Profile, Progress, Streak, and XP Foundation

## Implementation Summary

- Added pure TypeScript rules for learner-local dates, idempotent streak transitions, and the derived 250-XP level threshold.
- Added the forward-only learner foundation migration: profiles, goals, daily progress, append-only XP ledger, streak storage, owner/session extensions, foreign keys, RLS policies, and service-only reward RPCs.
- `record_answer_progress(answer_id)` awards 10 answer XP exactly once, increments one learner-local daily row only on that first award, and atomically records the one-per-date daily goal, streak transition, and 30 XP reward.
- `complete_session_rewards(session_id)` requires a completed assessment, awards 25 session XP exactly once, and awards the 20 XP General-topic bonus once per learner/topic. Both RPCs return ledger-derived totals, level, and newly awarded XP.
- Updated the target data-model specification and database architecture guide with the implemented foundation, fixed reward amounts, guest/session ownership behavior, and RLS boundary.

## RED/GREEN TDD Evidence

### RED

Command: `npx.cmd vitest run src/modules/progress/rules.test.ts`

Result: failed as expected before implementation because `./rules` did not exist:

```text
Error: Cannot find module './rules' imported from '.../src/modules/progress/rules.test.ts'
```

`npx` itself is blocked by this PowerShell execution policy, so the equivalent repository command used `npx.cmd`.

### GREEN

Command: `npx.cmd vitest run src/modules/progress/rules.test.ts`

Result: passed — 1 test file, 5 tests, 0 failures.

## Verification Evidence

- `npm.cmd run check` — passed (`tsc --noEmit`, exit 0).
- `npm.cmd test` — passed: 7 test files, 22 tests, 0 failures.
- `npm.cmd run build` — passed. It compiled, checked types, generated all 7 static pages, and collected traces. Next emitted its existing multiple-lockfile workspace-root warning.
- `git diff --check` — passed with no whitespace errors.

## Migration Verification Status

Externally unverified. The Supabase CLI is unavailable in this worktree and there is no local Supabase configuration, so `supabase db reset` and the required `pg_policies` inspection could not run.

Even with a CLI, repository documentation records that the checked-in migrations cannot recreate the pre-existing question-bank schema/data needed by the earliest practice migrations. A reset would therefore require that documented baseline before it can prove this migration end-to-end. No migration behavior or policy claim above is based on an unexecuted reset.

## Files Changed

- `src/modules/progress/rules.ts`
- `src/modules/progress/rules.test.ts`
- `supabase/migrations/202608210001_learning_profiles_progress.sql`
- `docs/specs/target-data-model.md`
- `docs/architecture/database-and-storage.md`
- `.superpowers/sdd/2026-08-21-personalized-general-speaking/task-1-report.md`

## Self-Review

- Confirmed the ownership constraint preserves all existing guest sessions and admits authenticated sessions without a guest token.
- Confirmed neither `daily_progress` nor `xp_events` has a client insert policy; profile/goal policies are owner-scoped select/update only and progress/reward reads are owner-scoped.
- Confirmed both RPCs are `security definer`, revoked from public/anon/authenticated, and granted only to `service_role`.
- Confirmed answer, daily-goal, session, and first-topic awards use unique ledger keys and reward totals are recomputed from the ledger.
- Confirmed no source change exposes `SECRET_KEY` or `OPENAI_API_KEY`, and no existing guest session authorization, private audio, or durable-job code changed.

## Concerns

- A local disposable Supabase reset and policy query remain required once the CLI and the documented question-bank baseline are available.

## Fix Round 1

### Findings Addressed

- `record_answer_progress` now selects `user_answers.created_at` into `v_registered_at` and derives `v_local_date` with `v_registered_at AT TIME ZONE v_timezone`. A delayed or retried reward call therefore credits the answer to its registration-time learner-local date rather than the RPC execution date.
- `xp_events` now accepts only the fixed event/amount pairs: `ANSWER=10`, `SESSION=25`, `DAILY_GOAL=30`, and `FIRST_TOPIC=20`. This protects the ledger-derived authoritative totals from invalid trusted-server inserts.

### Regression Coverage (RED/GREEN)

Added `src/modules/progress/migration.test.ts`, a focused migration-contract test permitted by the task because no database harness is available.

RED command: `npx.cmd vitest run src/modules/progress/migration.test.ts`

RED output: 1 test file failed, 2 tests failed. The migration did not contain `v_registered_at timestamptz` and did not contain the exact event/amount constraint.

GREEN command: `npx.cmd vitest run src/modules/progress/migration.test.ts src/modules/progress/rules.test.ts`

GREEN output: 2 test files passed, 7 tests passed, 0 failures.

### Verification

- `npx.cmd vitest run src/modules/progress/migration.test.ts src/modules/progress/rules.test.ts` — passed: 2 files, 7 tests.
- `npm.cmd run check` — passed (`tsc --noEmit`, exit 0).
- `npm.cmd test` — passed: 8 test files, 24 tests, 0 failures.
- `git diff --check` — passed with no whitespace errors.

### Changed Files

- `supabase/migrations/202608210001_learning_profiles_progress.sql`
- `src/modules/progress/migration.test.ts`
- `.superpowers/sdd/2026-08-21-personalized-general-speaking/task-1-report.md`
