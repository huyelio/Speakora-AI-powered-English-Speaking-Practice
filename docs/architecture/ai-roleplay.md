# Experimental AI Role-play

## Implemented scope

Ten role-play scenarios sit beside Topic Speaking in the speaking hub (`/speaking?tab=roleplay` lists them). `/speaking/conversation?scenario=<key>` opens the selected introduction and `?session=<uuid>` resumes an owned session; without either parameter the page redirects to the hub. Authentication and onboarding use the existing learner layout.

The session screen uses the shared A5 session frame (`src/components/session-frame/session-frame.css`), like topic practice and Vocabulary Learning V2, and shows no hub tabs. The top row holds the exit button, the scenario label and the goal dots, which open the goal list, plus **Kết thúc**. The body scrolls on its own. The AI line being answered is the teal bubble, and a side panel on wide screens shows the situation and goals. The action bar holds the recording deck with the hint and keyboard buttons. While a turn is processed, the learner's bubble appears immediately (typed text, or "Đang nhận diện lời nói…") and a typing bubble stands in for the AI reply. Each scenario has an optional Vietnamese `aiName` used as the speaker label; older snapshots without it fall back to the catalog entry with the same key.

Typed scenario data lives in `src/modules/conversation/scenario.ts` and `scenarios.ts`. Starting resolves a server-owned scenario key and atomically saves an owner-scoped session, scenario snapshot and opening message. UI, AI reply goals/instructions and TTS role use that snapshot on resume, even when the catalog changes. Legacy airplane snapshots receive defaults only for fields absent in the original format. Replaying preserves the selected scenario; choosing another returns to the catalog. User-message UUIDs provide idempotency; messages have ordered user/assistant roles. Audio is private in the existing `speaking-answers` bucket under `conversation/<user>/<session>/<message>/<lease>.<extension>`.

## Turn processing

`/api/conversation` is an authenticated endpoint:

- `GET ?sessionId=<uuid>` loads the owned session and ordered messages.
- `POST { action: "create", sessionId, scenarioKey }` starts/reloads an idempotent session. Omitted keys default to airplane for older clients. Existing session snapshots are never overwritten by a repeated create.
- Multipart `POST` with `sessionId`, `messageId`, and optional `audio` saves audio before calling the existing STT provider. JSON `{ action: "transcribe", sessionId, messageId, text }` supports keyboard fallback.
- `POST { action: "reply", sessionId, messageId }` uses stored dialogue and goals to produce a short contextual reply and structured goal IDs. Output is validated before an atomic save.
- Speech for an owned assistant message comes from `GET /api/tts?kind=conversation&session=&item=<messageId>`. The scenario's fixed opening is served from the shared TTS cache. AI replies are streamed straight to an `<audio>` element and never cached. The former `action: "tts"` now returns 400.
- `POST { action: "end", sessionId }` explicitly completes the session.
- `POST { action: "assess", sessionId }` reviews an ended session with at least 3 learner turns (one `OPENAI_ASSESSMENT_MODEL` call). The output is validated by `src/modules/conversation/assessment.ts` before `save_conversation_assessment` stores it. If a quote is not from the learner's own turns, the service retries once. A session that is still running, too short or already assessed is returned unchanged.

Each Supabase round trip costs roughly 120–190 ms from a local machine, so the turn path avoids extra ones: `load` runs its session and message queries in parallel, and a recording uploaded in the same request is transcribed from memory rather than downloaded again. A retry after refresh still downloads the saved audio.

These requests await processing directly, without fire-and-forget tasks. There is no worker job or pronunciation call. This is a synchronous prototype, not a durable autonomous job pipeline: interrupted requests may need explicit retry.

RPCs serialize each session's pending turn with a three-minute lease and fence stale processors with a token. Successful transcription is persisted and displayed before generation starts. Failed generation reuses the saved transcript; failed STT reuses saved audio. A new recording explicitly replaces failed audio. A request interrupted before upload is persisted requires re-recording or text. Older audio objects may remain after replacement; automated cleanup is deferred.

Refresh resumes through `?session=<uuid>`. The learner can retry a pending turn; if an interrupted request still owns a lease, retry after up to three minutes. Goal progress is approximate, supported by learner dialogue, monotonic, and persisted. Reaching 2/2 does not terminate the conversation. Six to ten learner turns is only an estimate; a 40-turn prototype limit bounds history/cost. A new session is required at that limit.

## Result, rewards and history

The result screen comes first, and the transcript folds under "Xem lại hội thoại". It shows:

- 1–3 stars and "x/y mục tiêu". Stars come from goals, not from the model: all goals give 3, at least half give 2, otherwise 1.
- Learner turns, average words per turn and questions the learner asked. These are computed in code.
- The XP earned.
- Four criteria (fluency and coherence, vocabulary, grammar, interaction), each with a Tốt / Khá / Cần luyện level and an optional "bạn nói → nên nói" example.
- Up to 3 natural rewrites and up to 4 useful phrases.

The feedback is transcript-only and says nothing about pronunciation. A session with fewer than 3 learner turns gets no stars, feedback or XP.

`save_conversation_assessment` keeps the first assessment and grants the rewards in the same transaction:

- a `CONVERSATION` XP event of 25, keyed `CONVERSATION:<id>`;
- min(turns, 5) answers credited to today's `daily_progress`. Reaching the daily target updates `user_streaks` and grants the shared `DAILY_GOAL` event (30 XP, one per learner and day across modes).

The awarded total is stored in `conversation_sessions.reward_xp`. Role-play XP rows use `xp_events.conversation_session_id`, because `session_id` references practice sessions.

`/history` merges practice and role-play sessions into one newest-first list with a shared keyset cursor (`getHistory` in `src/modules/dashboard/repository.ts`). A role-play row links back to `/speaking/conversation?session=<id>`.

## Local setup and test

1. Apply `supabase/migrations/202610040001_ai_conversation.sql`, then `202610220002_conversation_scenario_goals.sql`, then `202610280001_conversation_assessment_rewards.sql` to the same Supabase project as the app. The last one is required: the session query reads its columns. The latter updates only the turn-advance RPC to validate goal IDs against the stored scenario snapshot. It preserves the existing ownership and lease checks. Apply it before deploying the multi-scenario app. The existing auth schema and private `speaking-answers` bucket are required.
2. Configure server-only `PROJECT_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`, `OPENAI_API_KEY` and the existing `APP_URL`. Optional `OPENAI_CONVERSATION_MODEL` defaults to `OPENAI_ASSESSMENT_MODEL`, then `gpt-4o-mini`; STT/TTS retain existing settings.
3. With Node 20+, run `npm run dev`. The experimental mode does not require `npm run worker`. Keep the worker running to test the existing Topic Speaking flow.
4. Sign in and finish onboarding. Open `http://localhost:3000/speaking?tab=roleplay` and select **An airplane chat**. Repeat the flow with a social scenario to check different roles and goals.
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

Deferred: scenario administration/filtering, live streaming/interruption, pronunciation, recommendations from role-play results, analytics, avatar customization and abandoned-audio cleanup. The model uses scenario difficulty rather than a personalized learner level. Social scenarios describe context and reactions rather than a scripted dialogue; all scenarios retain the common one-question-per-turn and no-coaching rules.
