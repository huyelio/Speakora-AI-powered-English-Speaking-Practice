# Task 2 Report: Pronunciation Practice Persistence and Domain

## Implementation Summary

- Added `pronunciation_sessions`, `pronunciation_session_items`, and `pronunciation_attempts` with authenticated ownership, immutable vocabulary snapshots, source-linked weak retries, private upload metadata, normalized/raw results, bounded sanitized errors, lifecycle timestamps, constraints, indexes, and RLS without client policies.
- Added service-role-only `create_pronunciation_session`, `register_pronunciation_attempt`, and `complete_pronunciation_attempt` RPCs. Creation validates 1–20 unique ACTIVE topic/level items with nonblank IPA. Completion atomically stores provider results and completes a session only after every item has a completed attempt.
- Added a server-only repository for IPA-only topic availability, 10-item random unique standard sessions, owned session reads, deterministic latest-success selection, weak-session creation, and attempt register/start/complete/fail/retry helpers.
- Added score bands (`GOOD >= 85`, `PRACTICE >= 70`, `WEAK < 70`), weak-item rules (overall below 80, syllable below 70, or missing/extra syllable), session averages/counts, and weak-word summaries.
- Broadened the provider-neutral analysis contract so speaking rate and expected/detected IPA can be null without changing the Lingolix adapter's current behavior.
- Documented the migration, RPC security, Storage-prefix convention, and the dated implementation plan.

## TDD Evidence

Initial domain RED:

```text
npm test -- --run src/modules/pronunciation-practice/scoring.test.ts src/modules/pronunciation-practice/repository.test.ts
```

Both suites failed because the scoring and repository modules did not exist. The migration contract likewise failed before `202609270001_pronunciation_practice.sql` was created.

Review-fix RED cases caught:

- A guarded failure update returned a synthetic `FAILED` state after a concurrent completion had won.
- Standard sessions still defaulted to five instead of the approved ten items.
- The attempt lifecycle omitted the approved `UPLOADED` state.
- Exact idempotent registration retries failed after the final attempt completed its session.
- Application latest-success ordering omitted the SQL weak-selection `id DESC` tie-break.

All regression tests passed after the minimal fixes.

## Verification

- Focused pronunciation tests: 5 files, 38 tests passed.
- Pronunciation Practice domain subset: 20 tests passed.
- `npm run check`: passed (`tsc --noEmit`).
- Full `npm test`: 65 files, 253 tests passed.
- `git diff --check`: passed (only Git's informational LF-to-CRLF warning for the pre-existing TypeScript file).
- Independent final review: no Critical or Important issues; ready to merge.
- No live Supabase migration, Storage operation, or provider request was performed.

## Files Changed

- `supabase/migrations/202609270001_pronunciation_practice.sql`
- `src/modules/pronunciation-practice/types.ts`
- `src/modules/pronunciation-practice/scoring.ts`
- `src/modules/pronunciation-practice/scoring.test.ts`
- `src/modules/pronunciation-practice/repository.ts`
- `src/modules/pronunciation-practice/repository.test.ts`
- `src/modules/pronunciation-practice/migration.test.ts`
- `src/modules/pronunciation-analysis/types.ts`
- `docs/architecture/database-and-storage.md`
- `docs/plans/2026-09-27-pronunciation-practice-mvp.md`
- `docs/plans/README.md`
- `.superpowers/sdd/pronunciation-practice-mvp/task-2-report.md`

## Concerns

- PostgreSQL behavior is covered by migration contract tests and review, not a live database application. The migration must be applied and exercised against the intended Supabase project before claiming end-to-end verification.
- Pronunciation uploads reuse the existing private `speaking-answers` bucket under a pronunciation-specific path prefix; later routes must preserve authenticated proxy access and must not expose the service key.
- Raw provider results remain service-only persistence data. Learner-facing routes should return normalized results and sanitized errors only.
