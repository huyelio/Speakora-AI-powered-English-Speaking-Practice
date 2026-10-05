# AI Role-play MVP Implementation Plan

Goal: Add one persistent airplane role-play beside existing Topic Speaking.

Architecture: Separate conversation routes/modules/tables. Reuse authentication, private speaking-answers Storage, AudioRecorder and OpenAI STT/TTS. Synchronous, awaited HTTP steps persist transcription before generating a contextual reply; no worker or pronunciation changes.

- [x] Add ownership-protected conversation sessions/messages and atomic leased turn RPCs. Preserve every existing table/flow.
- [x] Add hardcoded scenario, validated AI response and provider with bounded history.
- [x] Add authenticated create/load/transcribe/reply/end/TTS endpoints. Persist audio before STT; preserve failed turns for explicit retries.
- [x] Add focused role-play UI and additive entry on /explore; microphone first, optional text/hints, goal notices, resume and completion.
- [x] Run focused tests, existing Speaking regression tests, TypeScript and production build. Document migration/setup and live-test limits.

Verification: 17 new tests pass; full current test discovery passes 159 files / 649 tests (includes the existing pronunciation worktree). `npm run check` and `npm run build` pass. Isolated PostgreSQL migration/RLS/idempotency/concurrency/goal/completion checks pass. Local HTTP smoke checks reached new/existing pages; conversation API rejects unauthenticated requests with 401. Browser unavailable; microphone interaction and live Storage/STT flow were not exercised. Configured Supabase REST returns 404 for the new table; apply the additive migration before testing persistence.

Live OpenAI provider smoke: two sample learner turns generated contextual replies about Thailand and temples, with destination_reason then both destination_reason/looking_forward detected. This verifies generation with configured credentials, not the full microphone/Storage/STT/persistence flow.

Constraints: No new dependencies, scenario browser, pronunciation, XP, history UI or shared Speaking refactors. Estimated 6–10 turns is guidance, not termination. All completed goals are monotonic; ending is explicit.
