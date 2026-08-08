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

- `practice_sessions`: guest-token hash, IELTS mode, five-question count, lifecycle status, and completion time.
- `session_questions`: ordered question IDs plus immutable JSON prompt snapshots.
- `user_answers`: one uploaded answer per session question, Storage metadata, duration, size, status, and idempotency key.
- `transcripts`: one original provider transcript per answer.
- `processing_jobs`: durable `STT` and `ASSESSMENT` work, attempts, locks, retry time, and sanitized errors.
- `session_assessments`: one structured assessment for the complete five-answer session.

The broader entities described in [the target data model](../specs/target-data-model.md), including profiles, rubric versions, speech metrics, criterion-level results, mock tests, and progress snapshots, are not implemented.

## Database Functions

- `create_ielts_practice_session(token_hash, question_ids[])` validates five unique active IELTS questions in Part 1/1/2/3/3 order and creates the session and prompt snapshots atomically.
- `register_practice_answer(...)` validates session-question membership and atomically creates an answer with its STT job.
- `claim_processing_job(worker_id)` atomically claims an eligible job with `FOR UPDATE SKIP LOCKED`.

These `security definer` functions revoke execution from `public`, `anon`, and `authenticated`; only the service role is granted execution.

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
