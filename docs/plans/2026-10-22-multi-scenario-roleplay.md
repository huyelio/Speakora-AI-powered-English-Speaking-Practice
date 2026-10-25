# Multi-scenario AI Role-play

Implement the approved minimal plan with ten typed scenarios and the existing conversation engine.

- [x] Add scenario catalog, per-scenario goal parsing and legacy airplane snapshot defaults.
- [x] Load session snapshots and pass them through create/reply/TTS.
- [x] Add a migration replacing fixed RPC goal IDs with snapshot-goal validation.
- [x] Add Speaking tabs, scenario catalog and shared scenario-aware conversation UI.
- [x] Add catalog, repository, provider, API and SQL regression coverage.
- [x] Verify tests, TypeScript, production build and isolated PostgreSQL migration.

Verification: 175 test files / 744 tests pass with two Vitest workers; TypeScript and production build pass. The isolated PostgreSQL script passes both migrations, legacy airplane and café goals, snapshot preservation, RLS, idempotency and lease checks. Local route responds HTTP 200. Live Supabase migration application, browser microphone and OpenAI end-to-end smoke tests have not been exercised.

Deploy the additive migration before enabling the new application version. No table changes or historical data rewrite is needed. Live audio/OpenAI and browser checks must be reported separately from automated tests.
