# Target Data Model

## Status and Authority

This is the long-term relational design. It preserves the broader data model needed for accounts, rubrics, metrics, history, and mock tests. For tables that exist today, [SQL migrations](../../supabase/migrations/) and [current database documentation](../architecture/database-and-storage.md) are authoritative.

## Design Principles

- Store queryable identities, relationships, status, and ordering in relational columns.
- Use JSONB only for format-specific configuration, provider metadata, snapshots, and structured raw output.
- Store binary audio in private object storage, not PostgreSQL.
- Version questions, prompts, rubrics, and assessment attempts for reproducibility.
- Use UUID primary keys, `timestamptz` in UTC, snake_case names, and explicit uniqueness/check constraints.
- Prefer restricted deletion or soft deletion for historical business records.

## Content Model

- `practice_modes`: IELTS, TOEIC Speaking, and General English.
- `question_types`: mode-specific timing, replay limits, required asset types, and configuration.
- `topics`: reusable topic taxonomy.
- `question_groups`: shared stimuli or related question sets.
- `questions`: prompt, instructions, mode/type/topic/group, difficulty, status, version, and timing overrides.
- `question_prompt_items`: ordered cue-card bullets or sub-prompts.
- `question_assets`: images, documents, audio, or text stimuli attached to a question/group.
- Target provenance entities: `content_sources` and per-question source/review links.

The implemented question bank already supports the core entities above except provenance records.

## Identity and Practice

- `profiles`: one-to-one extension of Supabase `auth.users`; roles and learning metadata belong here, never passwords/tokens.
- `practice_sessions`: owner or guest identity, mode, session/mock-test type, lifecycle, configuration, and locked rubric version.
- `session_questions`: ordered question references plus immutable prompt/config snapshots.
- `user_answers`: one logical submitted answer with idempotency and lifecycle status.
- `audio_records`: target normalized audio metadata when multiple recordings/versions are needed; the MVP stores this metadata on `user_answers`.

## Processing and Assessment

- `transcripts`: immutable original STT text, language, provider/model, segments, confidence when genuinely available, and metadata.
- `speech_metrics`: duration, word count, words per minute, speech ratio, pauses, quality flags, and analyzer version.
- `rubrics` and `rubric_versions`: mode/type applicability, score scale, prompt template, schema, and publication lifecycle.
- `assessment_results`: append-only attempts, validation status, overall score, provider/model/prompt version, token/latency/cost metadata, and current-result marker.
- `assessment_criteria`: criterion score, maximum, feedback, evidence, and display order.
- `processing_jobs`: durable job type, status, attempts, locks, retry schedule, external request ID, and sanitized errors.

The current MVP simplifies assessment to one `session_assessments` row containing the session-level structured result.

## Future Mock Tests and Progress

- `test_templates`, `test_template_sections`, and `test_template_items` define reusable mock-test structures; an actual attempt still materializes `practice_sessions` and `session_questions` snapshots.
- Progress should initially be derived from sessions, answers, assessments, and criteria. Add materialized views or daily snapshots only after query volume justifies denormalization.

## Consistency Requirements

- Session creation atomically creates the session and ordered snapshots.
- Answer registration verifies Storage state and atomically creates idempotent answer/job state.
- Assessment publication validates structured output, writes criteria, changes the current-result marker, and completes the answer/session atomically.
- Prevent two active jobs for the same work item and job type.
- Enable RLS on learner data; learners may read only their own records, while workers use service credentials after server-side authorization.

## Recommended Query Indexes

Prioritize active question selection, group ordering, session question ordering, user/session history, answer/job status, assessment lookup, criterion aggregation, and retry scheduling. Add JSONB GIN or full-text indexes only when a real query requires them.
