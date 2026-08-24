# Task 5 Report: Topic Availability and General Question Selection

## Delivered behavior

- `GET /api/topics` is authenticated-only. It derives the learner from `getRequestUser`, ignores caller-supplied user IDs, accepts optional case-insensitive `search` and validated `level` filters, and returns `401` for unauthenticated requests.
- The topic repository uses the service-role client only after that route authentication boundary. It reads only active `GENERAL` questions with active topics, modes, and question types; aggregates each topic/difficulty in server code; reads only the caller's completed General session history; and never applies search before the active-General query restriction.
- Topic summaries omit every topic/difficulty combination with fewer than five questions, merge `practicedCount`/`lastPracticedAt`, sort levels by learner level and topics by name, and search names/slugs case-insensitively.
- `selectGeneralQuestions` removes duplicate IDs, preserves repository order for unseen questions, then fills remaining slots using least-recently answered questions ordered by timestamp and code. It either returns exactly five unique questions or throws.
- Forward-only migration `202608210003_general_practice_sessions.sql` adds `create_general_practice_session`. The RPC validates the authenticated owner exists, the active General mode/topic, supported learner level, exactly five unique IDs, and every selected question's active mode/topic/level/status before atomically creating an owned General session and five immutable snapshots. Execution is revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`.

## TDD evidence

1. Added `general-selection.test.ts`, then ran `npx.cmd vitest run src/modules/questions/general-selection.test.ts`.
   - **RED:** module `./general-selection` did not exist.
   - **GREEN:** after implementing the selector, all 3 selection tests passed.
2. Added `availability.test.ts`, then ran `npx.cmd vitest run src/modules/topics/availability.test.ts`.
   - **RED:** module `./availability` did not exist.
   - **GREEN:** both availability/filtering tests passed.
3. Added `route.test.ts`, then ran `npx.cmd vitest run src/app/api/topics/route.test.ts`.
   - **RED:** route module did not exist.
   - **GREEN:** authenticated-owner, invalid-level, and normalized-filter tests passed.
4. Added `general-session-migration.test.ts`, then ran `npx.cmd vitest run src/modules/topics/general-session-migration.test.ts`.
   - **RED:** migration file did not exist.
   - **GREEN:** the static contract validates the RPC signature, owner/five-ID checks, active General restrictions, snapshot inserts, and service-role-only grants.

## Verification

- `npx.cmd vitest run src/modules/topics src/modules/questions/general-selection.test.ts src/app/api/topics/route.test.ts` — **PASS:** 4 files, 9 tests.
- `npm.cmd run check` — **PASS:** `tsc --noEmit` exited 0.
- `npm.cmd test` — **PASS:** 20 files, 56 tests.
- `npm.cmd run build` — **PASS:** Next.js production build exited 0. It retains the existing linked-worktree dual-lockfile root-inference warning.
- `git diff --check` — **PASS:** no whitespace errors. Git emitted only its normal LF-to-CRLF notice for the edited architecture document.

## Live SQL limitation

Live Supabase migration/RPC execution is **unverified**. `Get-Command supabase` found no local Supabase CLI, and this repository's checked-in migrations lack the pre-existing question-bank baseline required for a disposable reset. Consequently, no `supabase db reset` or mixed-topic RPC rejection was run against a database. The static migration contract test, TypeScript tests, typecheck, full suite, and production build are verified locally; this is not evidence of a live SQL flow.

## Self-review

- Confirmed the API has no client-supplied owner parameter and reaches the admin-backed repository only after authentication.
- Confirmed General availability and candidate queries constrain mode, topic, question type, and question status before in-memory grouping or selection.
- Confirmed the RPC locks selected source rows before validation/snapshotting, keeps IELTS SQL untouched, and returns the same row shape as the IELTS creation RPC.
