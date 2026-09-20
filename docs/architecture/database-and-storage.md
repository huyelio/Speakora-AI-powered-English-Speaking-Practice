# Database and Storage

## Sources of Truth

The implemented database currently has two sources:

- The seven question-bank tables predate the checked-in migration history. Their live REST/OpenAPI shape is recorded in [the generated question-bank snapshot](question-bank-schema-snapshot.md).
- SQL files in `supabase/migrations/`, applied in filename order, are authoritative for practice sessions, learner progress, vocabulary practice, Storage, RLS, and RPC additions.

Current migration set (filename order):

| Migration | Adds / changes |
| --- | --- |
| `202608070001_ielts_speaking_mvp.sql` | Speaking MVP tables, Storage bucket, session/answer/job RPCs, RLS |
| `202608070002_fix_create_session_ambiguity.sql` | Clarify IELTS create RPC signature |
| `202608080001_ielts_part_distribution.sql` | IELTS create takes ordered `uuid[]`; Part 1/1/2/3/3 validation |
| `202608210001_learning_profiles_progress.sql` | Profiles/progress/XP; session owner XOR; GENERAL mode columns |
| `202608210002_learner_onboarding_rpc.sql` | `upsert_learner_onboarding` |
| `202608210003_general_practice_sessions.sql` | First General create RPC |
| `202608210004_retry_failed_jobs_atomic.sql` | `retry_failed_processing_jobs` |
| `202608210005_general_assessments.sql` | `session_assessments.assessment_mode` IELTS/GENERAL |
| `202608210006_learner_xp_total.sql` | XP total + topic history/availability RPCs |
| `202609120001_topic_practice_question_count.sql` | `topics.difficulty_level`; flexible General `question_count` 1–20 |
| `202609120002_topic_difficulty_seed.sql` | Seed General topic difficulties by slug |
| `202609130001_vocabulary_practice.sql` | Vocabulary items/sessions/reviews + `create_vocabulary_session` |

The repository cannot recreate the question bank from migrations alone. A new environment needs the existing question-bank schema/data or a baseline migration that has not yet been added. Generated snapshots are read-only diagnostics and may lag until `npm run db:schema` is run against the intended project.

## Implemented Tables

### Question bank

- `practice_modes`: IELTS, TOEIC, and General mode metadata.
- `question_types`: mode-specific formats and default timing.
- `topics`: topic taxonomy; General topics may carry `difficulty_level` (`BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` \| null) plus `created_at` / `updated_at` from later migrations.
- `question_groups`: shared context and grouped questions.
- `questions`: versioned prompts, status, difficulty, timing, and configuration.
- `question_prompt_items`: ordered cue-card or prompt bullets.
- `question_assets`: optional text or Storage-backed stimuli.

### Speaking practice MVP

- `practice_sessions`: guest-token hash **or** authenticated owner (XOR), `mode` `IELTS` \| `GENERAL`, configurable `question_count` (1–20; IELTS create still fixes 5), optional `topic_id` / `difficulty_level`, lifecycle status, and completion time.
- `session_questions`: ordered question IDs plus immutable JSON prompt snapshots.
- `user_answers`: one uploaded answer per session question, Storage metadata, duration, size, status, and idempotency key.
- `transcripts`: one original provider transcript per answer.
- `processing_jobs`: durable `STT` and `ASSESSMENT` work, attempts, locks, retry time, and sanitized errors.
- `session_assessments`: one structured assessment per completed speaking session; `assessment_mode` distinguishes IELTS vs GENERAL.

### Learner profile and progress

- `profiles` and `learning_goals` store learner metadata and one daily answer target per user.
- `daily_progress`, `xp_events`, and `user_streaks` hold learner-local answer counts with a per-day target snapshot, an idempotent XP ledger, and goal-based streak state.
- Learners can read only their own profile, goal, progress, streak, and XP rows. Profile and goal writes go through the ownership-checking onboarding RPC; client roles cannot directly update them or write progress and XP rows.

### Vocabulary practice (parallel to speaking)

Migration `202609130001_vocabulary_practice.sql` adds a flashcard domain that does **not** reuse `practice_sessions`, audio Storage, STT, or the worker:

- `vocabulary_items`: content bank keyed to existing General `topics`; fields include `word`, `meaning_vi`, nullable `definition_en`, `example_sentence`, nullable `pronunciation_ipa`, `level` (`BEGINNER` \| `INTERMEDIATE` \| `ADVANCED`), `status` (`DRAFT` \| `ACTIVE` \| `ARCHIVED`), optional provenance (`source`, `source_ref`) with a unique pair for idempotent import.
- `vocabulary_sessions`: authenticated-only sessions (`user_id`), `topic_id`, `level`, `item_count` (1–20), `status` (`IN_PROGRESS` \| `COMPLETED`), `completed_at`.
- `vocabulary_session_items`: ordered items with immutable `snapshot` jsonb (`word`, meanings, example, IPA, `level`, `first_letter_hint`).
- `vocabulary_reviews`: one self-review per session item (`REMEMBERED` \| `NOT_REMEMBERED`) and `reviewed_at`.

All four vocabulary tables have RLS enabled with no client write policies; the Next.js server uses the service role after cookie auth, matching the speaking MVP posture.

Offline import scripts under `scripts/vocabulary/` prepare JSONL and upsert into `vocabulary_items`; embeddings are used only during mapping, not at runtime.

The broader entities described in [the target data model](../specs/target-data-model.md), including rubric versions, speech metrics, criterion-level results, mock tests, and spaced-repetition scheduling, are not implemented.

## Database Functions

- `upsert_learner_onboarding(...)` verifies the request JWT owner, validates profile fields and the IANA timezone, and atomically upserts the learner profile and its daily answer goal.
- `create_ielts_practice_session(token_hash, question_ids[])` validates five unique active IELTS questions in Part 1/1/2/3/3 order and creates the session and prompt snapshots atomically.
- `create_general_practice_session(user_id, topic_id, question_ids[])` validates one authenticated learner's unique active General questions for the requested topic (1–20), copies topic `difficulty_level` onto the session, and creates owned session + immutable prompt snapshots.
- `create_vocabulary_session(user_id, topic_id, level, item_ids[])` validates an authenticated learner, an active General topic, and unique ACTIVE vocabulary items for that topic+level (1–20), then creates the session and ordered item snapshots atomically.
- `register_practice_answer(...)` validates session-question membership and atomically creates an answer with its STT job.
- `claim_processing_job(worker_id)` atomically claims an eligible job with `FOR UPDATE SKIP LOCKED`.
- `retry_failed_processing_jobs(...)` requeues failed jobs under service role.
- `record_answer_progress(answer_id)` records answer XP and learner-local goal/streak transitions from durable owner/session data.
- `complete_session_rewards(session_id)` awards completed-session and first-General-topic XP from durable session/assessment data.
- `get_learner_xp_total(user_id)` aggregates the append-only XP ledger.
- `get_learner_topic_history(user_id)` and `get_general_topic_availability()` return grouped learner history and active question availability for catalog/dashboard reads.

`upsert_learner_onboarding` is executable by `authenticated` and verifies that `auth.uid()` matches its requested owner. Speaking create/progress/job RPCs and `create_vocabulary_session` revoke execution from `public`, `anon`, and `authenticated`; only the service role may execute them after the server has authenticated and authorized the request.

## Storage

Migration `202608070001_ielts_speaking_mvp.sql` creates the private `speaking-answers` bucket with a 25 MB object limit and supported WebM, MP4, and OGG MIME types. Answer paths follow:

```text
sessions/{sessionId}/answers/{answerId}.{extension}
```

The browser uploads through the authorized Next.js route rather than receiving the service key or direct unrestricted Storage access. Result playback fetches an authorized Next.js endpoint; that endpoint verifies answer/session membership and proxies the private object. The worker downloads objects with the service role.

Vocabulary Practice does not use this bucket; word audio is synthesized on demand via OpenAI TTS and is not persisted in Storage.

## Security Notes

- MVP business tables (speaking and vocabulary) have RLS enabled and are accessed through trusted server code with the service role.
- Guest ownership (IELTS only) is enforced in route handlers by hashing the bearer token and comparing it with `timingSafeEqual`.
- The raw guest token lives only in the browser response/session storage; the database stores its hash.
- Vocabulary sessions require an authenticated Supabase user; there is no guest vocabulary path.
- `SECRET_KEY`, `OPENAI_API_KEY`, audio contents, and bearer tokens must not be logged or exposed to client bundles.
- Future authenticated direct-table access must add explicit user policies instead of weakening the current service-only posture.

## Schema Workflow

After applying migrations to the intended Supabase project:

```powershell
npm run db:schema
```

The exporter intentionally reads only the seven question-bank tables and their row counts. It is a diagnostic snapshot, not a migration or complete dump of speaking, vocabulary, constraints, functions, policies, or Storage configuration.
