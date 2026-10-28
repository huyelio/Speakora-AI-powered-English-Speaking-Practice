# Vocabulary Learning V2 implementation

Approved 2026-10-25. Add `/vocabulary-learning` with Learn → Pronounce → Recall → Context → Summary. Preserve the two legacy modes and reuse vocabulary content/sessions/reviews, pronunciation sessions/attempts, TTS, recorder and Azure pipeline. No new progress tables or adaptive scheduler.

## Decisions

- Exactly one topic and level; at most six active IPA-ready distinct vocabulary IDs, ordered WEAK, LEARNING, NEW, oldest practice first. MASTERED only by explicit review.
- NEW has no review or completed assessment. WEAK has latest failed recall/self-review or weak latest completed pronunciation. MASTERED requires two latest V2 recalls correct in distinct sessions and a valid nonweak latest pronunciation. Other history is LEARNING. Infrastructure failures never imply weakness.
- Recall/context use trimmed case-insensitive exact word matching; first answer wins. Context blanks all whole-word occurrences in existing examples, max three prompts, recall mistakes before pronunciation weaknesses. No matching example means skip context.
- Create linked sessions atomically and idempotently. Persist stage/cursor and frozen context IDs. Completion belongs to V2 Summary, not the pronunciation sub-session. Resume from server state.
- Summary compares initial evidence with current evidence; weak review creates another V2 session restricted to source items.

## Work checklist

- [x] 1. Rules fixtures/tests.
- [x] 2. Pure learning-state/selection/context rules.
- [x] 3. Additive migration and aggregated history.
- [x] 4. Transactional linked session creation.
- [x] 5. V2 repository, authenticated routes and persistence.
- [x] 6. Landing, dashboard entry, Learn/TTS.
- [x] 7. Embed pronunciation card with opt-in V2 props.
- [x] 8. Recall and Context rounds.
- [x] 9. Summary, weak retry and legacy guards.
- [x] 10. Local regression, SQL smoke verification, documentation and review.

## Verification

Test rules, owner isolation, linked IDs/order, retries/concurrent requests, atomic rollback, stage transitions, reload, first-answer persistence, context freezing and legacy behavior. Run focused tests, typecheck, full suite, build. Exercise migrations on an isolated PostgreSQL instance; never claim live Azure/Supabase verification without actually exercising it. Preserve existing `next-env.d.ts` changes.

Implementation is on `feat/vocabulary-learning-v2`. Local PostgreSQL tests exercise real migrations/RPCs with synthetic pronunciation results. Review corrected client assessment validity and uppercase UUID retry handling. Live migration deployment and a real microphone/Azure flow remain a demo-environment verification step; no live database was changed during implementation.

Local verification on 2026-10-25: `npm run check` and `npm run build` passed; `npm test` passed 795 tests (the existing runner also discovers the pre-existing pronunciation worktree). Seven opt-in PostgreSQL integration tests passed separately, including simultaneous same-request creation, matching item order, rollback, ownership, stage guards, first-answer wins and mastery across distinct sessions. The standard suite skips these seven Docker tests by design.
