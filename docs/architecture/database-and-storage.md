# Database and Storage

## Sources of Truth

The implemented database currently has two sources:

- The seven question-bank tables predate the checked-in migration history. Their live REST/OpenAPI shape is recorded in [the generated question-bank snapshot](question-bank-schema-snapshot.md).
- SQL files in `supabase/migrations/`, applied in filename order, are authoritative for the IELTS session, answer, job, transcript, assessment, Storage, RLS, and RPC additions.

The repository cannot recreate the question bank from migrations alone. A new environment needs the existing question-bank schema/data or a baseline migration that has not yet been added. Generated snapshots are read-only diagnostics and may lag until `npm run db:schema` is run against the intended project.

## Implemented Tables

### Question bank

- `practice_modes`: IELTS, TOEIC, and General mode metadata.
- `question_types`: mode-specific formats and default timing.
- `topics`: topic taxonomy.
- `question_groups`: shared context and grouped questions.
- `questions`: versioned prompts, status, difficulty, timing, and configuration.
- `question_prompt_items`: ordered cue-card or prompt bullets.
- `question_assets`: optional text or Storage-backed stimuli.

### IELTS practice MVP

- `practice_sessions`: guest-token hash or authenticated owner, IELTS or GENERAL mode, configurable `question_count` (1–20, default 5), optional `topic_id`, lifecycle status, and completion time.
- `session_questions`: ordered question IDs plus immutable JSON prompt snapshots.
- `user_answers`: one uploaded answer per session question, Storage metadata, duration, size, status, and idempotency key.
- `transcripts`: one original provider transcript per answer.
- `processing_jobs`: durable `STT` and `ASSESSMENT` work, attempts, locks, retry time, and sanitized errors.
- `session_assessments`: one structured assessment for the complete five-answer session.

### Learner profile and progress foundation

Migration `202608210001_learning_profiles_progress.sql` adds the first authenticated-learner foundation:

- `profiles` and `learning_goals` store learner metadata and one daily answer target per user.
- `daily_progress`, `xp_events`, and `user_streaks` hold learner-local answer counts with a per-day target snapshot, an idempotent XP ledger, and goal-based streak state. The snapshot keeps same-day progress stable when the current goal is edited.
- `practice_sessions` now supports either an authenticated owner or its existing guest-token-hash owner, while preserving guest IELTS sessions.

All five learner tables have RLS. Learners can read only their own profile, goal, progress, streak, and XP rows. Profile and goal writes go through the ownership-checking onboarding/profile RPC; client roles cannot directly update them or write progress and XP rows.

The broader entities described in [the target data model](../specs/target-data-model.md), including rubric versions, speech metrics, criterion-level results, and mock tests, are not implemented.

## Database Functions

- `upsert_learner_onboarding(...)` verifies the request JWT owner, validates profile fields and the IANA timezone, and atomically upserts the learner profile and its daily answer goal.
- `create_ielts_practice_session(token_hash, question_ids[])` validates five unique active IELTS questions in Part 1/1/2/3/3 order and creates the session and prompt snapshots atomically.
- `register_practice_answer(...)` validates session-question membership and atomically creates an answer with its STT job.
- `claim_processing_job(worker_id)` atomically claims an eligible job with `FOR UPDATE SKIP LOCKED`.
- `record_answer_progress(answer_id)` records answer XP and learner-local goal/streak transitions from durable owner/session data.
- `complete_session_rewards(session_id)` awards completed-session and first-General-topic XP from durable session/assessment data.
- `create_general_practice_session(user_id, topic_id, question_ids[])` validates one authenticated learner's unique active General questions for the requested topic, stores the requested `question_count`, and creates the owned session and immutable prompt snapshots atomically.
- `get_learner_xp_total(user_id)` aggregates the append-only XP ledger in PostgreSQL so learner dashboard and result-progress reads remain one bounded scalar response regardless of ledger size.
- `get_learner_topic_history(user_id)` and `get_general_topic_availability()` return grouped learner history and active question availability so catalog/dashboard reads do not transfer unbounded session or question rows.

`upsert_learner_onboarding` is intentionally executable by `authenticated` and verifies that `auth.uid()` matches its requested owner. The processing, reward, General-session, learner-aggregate, and availability functions revoke execution from `public`, `anon`, and `authenticated`; only the service role may execute them after the server has authenticated and authorized the request. Local migration verification remains pending because the checked-in migration history lacks the pre-existing question-bank baseline required for a disposable reset.

## Storage

Migration `202608070001_ielts_speaking_mvp.sql` creates the private `speaking-answers` bucket with a 25 MB object limit and supported WebM, MP4, and OGG MIME types. Answer paths follow:

```text
sessions/{sessionId}/answers/{answerId}.{extension}
```

The browser uploads through the authorized Next.js route rather than receiving the service key or direct unrestricted Storage access. Result playback fetches an authorized Next.js endpoint with the guest bearer token; that endpoint verifies answer/session membership and proxies the private object. The worker downloads objects with the service role.

## Security Notes

- All MVP business tables have RLS enabled and are accessed through trusted server code.
- Guest ownership is enforced in route handlers by hashing the bearer token and comparing it with `timingSafeEqual`.
- The raw guest token lives only in the browser response/session storage; the database stores its hash.
- `SECRET_KEY`, `OPENAI_API_KEY`, audio contents, and bearer tokens must not be logged or exposed to client bundles.
- Future authenticated access must add explicit user policies instead of weakening the current service-only posture.

## Schema Workflow

After applying migrations to the intended Supabase project:

```powershell
npm run db:schema
```

The exporter intentionally reads only the seven question-bank tables and their row counts. It is a diagnostic snapshot, not a migration or complete dump of the MVP tables, constraints, functions, policies, or Storage configuration.
