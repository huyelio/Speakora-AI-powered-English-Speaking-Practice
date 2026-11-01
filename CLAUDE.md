# CLAUDE.md

Speakora is an AI English-speaking practice app: a TypeScript modular monolith with a Next.js 15 (App Router, React 19) web app and a separate long-running worker, backed by Supabase (Postgres, Auth, private Storage). The working conventions in [AGENTS.md](AGENTS.md) apply as well. Read them first.

## Commands

```powershell
npm run dev          # Next.js dev server (output in .next-dev, so a build won't clobber it)
npm run worker       # background STT/assessment worker (tsx, reads .env)
npm test             # all Vitest tests
npx vitest run src/modules/practice/repository.test.ts   # one file
npx vitest run -t "test name"                           # by name
npm run check        # tsc --noEmit
npm run build        # production build (.next)
npm run questions:check | questions:import -- <csv>      # question-bank CSV import
npm run vocabulary:extract|map|import|sample             # vocabulary data pipeline (scripts/vocabulary/)
npm run db:schema    # regenerate question-bank schema snapshot (not a migration)
```

UI work is verified at desktop width only. Don't take phone-width screenshots, add mobile-specific polish or write new mobile media queries unless asked. Keep the existing responsive CSS, because the app still has to work on phones.

Before you say a change is done, run the relevant tests and `npm run check`. For broad changes, also run `npm test` and `npm run build`. The SQL integration test in `src/modules/vocabulary-learning/sql.integration.test.ts` runs only when `V2_SQL_TEST=1` is set, and it needs Docker.

## Environment

The web app reads `.env.local` and the worker and scripts read `.env`. Use `.env.example` as the template. The Supabase vars are named `PROJECT_URL`, `PUBLISHABLE_KEY` and `SECRET_KEY` (service role), not the usual `SUPABASE_*` names. They are validated in `src/lib/supabase/config.ts`. Other keys: `OPENAI_*` (TTS/STT/assessment/conversation models), `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` (pronunciation), `APP_URL` (auth email redirects) and `WORKER_POLL_MS`. Never expose `SECRET_KEY`, `OPENAI_API_KEY` or the Azure keys to client code.

## Architecture

- **Web (`src/app/`)**: authenticated learner pages live in the `(learn)` route group (dashboard, speaking hub, vocabulary hub, pronunciation, IELTS, history, profile). `middleware.ts` refreshes the Supabase auth cookie for those paths. HTTP handlers are under `src/app/api/` and stay thin by delegating to `src/modules/`. Auth (sign up, sign in, sign out, password reset) is done with Server Actions in `src/modules/auth/actions.ts`, not API routes. `src/app/demo/speech/` is the guest IELTS flow, kept for regression testing. `next.config.mjs` redirects the old entry pages (`/explore`, `/pronunciation`, `/vocabulary-learning`) into the A5 hubs.
- **Domain modules (`src/modules/`)**: one folder per domain (practice, questions, assessment, vocabulary, vocabulary-learning, pronunciation-practice, pronunciation-analysis, conversation, dashboard, profile, progress, recommendations, topics, audio, auth). Each repository talks to Supabase and calls RPCs for multi-row transactional writes.
- **AI gateway (`src/modules/ai-gateway/`)**: provider interfaces (`TextToSpeechProvider`, `SpeechToTextProvider`, `AssessmentProvider`, `ConversationProvider`) with OpenAI implementations. Pronunciation analysis uses Azure Speech (`src/modules/pronunciation-analysis/azure.ts`, with ffmpeg conversion to WAV). Older stored Lingolix results are still readable.
- **Worker (`src/worker/`)**: polls `claim_processing_job` (Postgres `SKIP LOCKED`) for durable `STT` and `ASSESSMENT` jobs. When every answer in a session has a transcript, it enqueues assessment, then saves the result and grants rewards idempotently. Processor logic in `processors.ts` takes injected DB and provider interfaces so it can be unit-tested.
- **TTS**: one endpoint, `GET /api/tts`, backed by `src/modules/tts/`. Fixed bank text is cached in the private `tts-cache` bucket, and `npm run tts:prebuild` can fill it ahead of time. Per-learner AI text streams and is never cached.
- **Synchronous flows**: word pronunciation attempts and AI conversation turns are processed inside the request. They do not go through `processing_jobs`.
- **Database (`supabase/migrations/`)**: this is the authoritative schema. Apply files in filename order and add a new timestamped file for any schema change. RLS is on, but server code uses the service-role key, so ownership checks in code are still required. Recordings go to private buckets such as `speaking-answers`.

## Invariants to preserve

- Every practice session is owned either by a user or by a hashed guest token, never both. Every read, upload, audio fetch and retry checks ownership.
- Question and word content is snapshotted into session rows when the session is created. Don't read the live bank to render an existing session.
- Submissions carry idempotency keys, and replays must return the existing row. XP, progress and streak events are deduplicated.
- AI output is validated against a schema before it is saved (for example `assessment/general-schema.ts`, where example quotes must appear in the transcript). General English shows no IELTS band, and transcript-based assessment never judges pronunciation.

## Testing patterns

Tests are colocated as `*.test.ts(x)`. Several `*migration.test.ts` files read SQL migration text and assert on it with regexes, so editing a migration can break them. Repository tests use fake Supabase clients rather than a live database.

## Docs

`docs/README.md` is the index. `docs/architecture/` describes current behaviour, `docs/specs/` describes intent and future state, and `docs/plans/` holds dated plans. Create or update a plan there for medium-sized or larger changes. The current work is the A5 redesign (`docs/plans/2026-10-26-redesign-a5.md`; styles in `src/app/a5.css`). Project docs are written in English. Learner-facing UI copy is written in Vietnamese as `t("…")` keys, with the English text in `src/i18n/en.ts` (see `docs/architecture/i18n.md`). `docs/bao-cao-tot-nghiep.tex` is the Vietnamese graduation thesis that describes the system. When source and docs disagree, the source and migrations win.

## Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes, adapted from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
