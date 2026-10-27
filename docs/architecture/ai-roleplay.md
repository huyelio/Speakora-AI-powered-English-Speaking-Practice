# Experimental AI Role-play

## Implemented scope

`/speaking/conversation` offers ten role-play scenarios beside Topic Speaking. Speaking has two link tabs: Topic Speaking at `/explore` and AI Role-play at `/speaking/conversation`. The latter opens a static scenario catalog; `?scenario=<key>` opens the selected introduction and `?session=<uuid>` resumes an owned session. Authentication and onboarding use the existing learner layout.

Typed scenario data lives in `src/modules/conversation/scenario.ts` and `scenarios.ts`. Starting resolves a server-owned scenario key and atomically saves an owner-scoped session, scenario snapshot and opening message. UI, AI reply goals/instructions and TTS role use that snapshot on resume, even when the catalog changes. Legacy airplane snapshots receive defaults only for fields absent in the original format. Replaying preserves the selected scenario; choosing another returns to the catalog. User-message UUIDs provide idempotency; messages have ordered user/assistant roles. Audio is private in the existing `speaking-answers` bucket under `conversation/<user>/<session>/<message>/<lease>.<extension>`.

## Turn processing

`/api/conversation` is an authenticated endpoint:

- `GET ?sessionId=<uuid>` loads the owned session and ordered messages.
- `POST { action: "create", sessionId, scenarioKey }` starts/reloads an idempotent session. Omitted keys default to airplane for older clients. Existing session snapshots are never overwritten by a repeated create.
- Multipart `POST` with `sessionId`, `messageId`, and optional `audio` saves audio before calling the existing STT provider. JSON `{ action: "transcribe", sessionId, messageId, text }` supports keyboard fallback.
- `POST { action: "reply", sessionId, messageId }` uses stored dialogue and goals to produce a short contextual reply and structured goal IDs. Output is validated before an atomic save.
- `POST { action: "tts", sessionId, messageId }` speaks only an owned assistant message, using the existing TTS provider.
- `POST { action: "end", sessionId }` explicitly completes the session; a completion screen shows learner-turn count and goals.

These requests await processing directly, without fire-and-forget tasks. There is no new worker job, pronunciation call, or XP integration. This is a synchronous prototype, not a durable autonomous job pipeline: interrupted requests may need explicit retry.

RPCs serialize each session's pending turn with a three-minute lease and fence stale processors with a token. Successful transcription is persisted and displayed before generation starts. Failed generation reuses the saved transcript; failed STT reuses saved audio. A new recording explicitly replaces failed audio. A request interrupted before upload is persisted requires re-recording or text. Older audio objects may remain after replacement; automated cleanup is deferred.

Refresh resumes through `?session=<uuid>`. The learner can retry a pending turn; if an interrupted request still owns a lease, retry after up to three minutes. Goal progress is approximate, supported by learner dialogue, monotonic, and persisted. Reaching 2/2 does not terminate the conversation. Six to ten learner turns is only an estimate; a 40-turn prototype limit bounds history/cost. A new session is required at that limit.

## Local setup and test

1. Apply `supabase/migrations/202610040001_ai_conversation.sql`, then `202610220002_conversation_scenario_goals.sql` to the same Supabase project as the app. The latter updates only the turn-advance RPC to validate goal IDs against the stored scenario snapshot. It preserves the existing ownership and lease checks. Apply it before deploying the multi-scenario app. The existing auth schema and private `speaking-answers` bucket are required.
2. Configure server-only `PROJECT_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`, `OPENAI_API_KEY` and the existing `APP_URL`. Optional `OPENAI_CONVERSATION_MODEL` defaults to `OPENAI_ASSESSMENT_MODEL`, then `gpt-4o-mini`; STT/TTS retain existing settings.
3. With Node 20+, run `npm run dev`. The experimental mode does not require `npm run worker`. Keep the worker running to test the existing Topic Speaking flow.
4. Sign in and finish onboarding. Open `http://localhost:3000/explore`, choose the **AI Role-play** tab, and select **An airplane chat**. Repeat the flow with a social scenario to check different roles and goals.
5. Start; verify opening message. Press mic, speak, press again to stop/send. For example: “I'm going to Thailand for a holiday. I'm visiting my friend there.” Verify transcript appears before a contextual reply. Press **Nghe** for AI voice.
6. Say “I'm looking forward to visiting the temples.” Check inline goal completion and badge progress. Use the hint only when requested; try keyboard fallback separately.
7. Refresh the session URL. Verify messages/progress persist. Continue talking after 2/2, then choose **Kết thúc**. Verify result and refresh it. **Luyện lại tình huống** opens a fresh introduction.
8. Simulate a network error and use explicit retry. Retry uses the same message UUID, preventing duplicate messages. While recording a replacement, retry is disabled. Two simultaneous tabs cannot submit different pending turns.
9. Return to `/explore`, select a regular topic and complete its existing question flow with `npm run worker` running. Existing sessions and data remain valid.

Checks: `npm run check`, `npm test`, `npm run build`. No standalone lint script is configured; Next build runs its configured lint/type validation.

Optional SQL verification without adding project dependencies:

```powershell
$roleplayValidation = Join-Path $env:TEMP 'speakora-conversation-sql-check'
npm install --prefix $roleplayValidation --no-audit --no-fund @electric-sql/pglite
node scripts/verify-conversation-migration.mjs (Join-Path $roleplayValidation 'node_modules/@electric-sql/pglite/dist/index.js')
```

This executes the migration and ownership/idempotency/concurrency/goal tests in an isolated PostgreSQL engine. It does not verify live Supabase Storage, credentials, browser microphone, or OpenAI calls.

Deferred: scenario administration/filtering, live streaming/interruption, pronunciation, detailed corrections, scoring, XP, analytics, history UI, avatar customization and abandoned-audio cleanup. The model uses scenario difficulty rather than a personalized learner level. Social scenarios describe context and reactions rather than a scripted dialogue; all scenarios retain the common one-question-per-turn and no-coaching rules.
