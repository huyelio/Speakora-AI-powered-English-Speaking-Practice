# Topic-based Practice Sessions

**Goal:** Refactor General practice session creation to be topic-first with a configurable question count, while keeping the guest IELTS 2/1/2 demo unchanged.

**Approach:** Reuse the existing `topics` and `questions.topic_id` model, relax the database `question_count = 5` constraint, replace the General create RPC, and stop filtering session questions by per-question difficulty.

## Completed Changes

- Added migration `202609120001_topic_practice_question_count.sql`.
- Relaxed `practice_sessions.question_count` to `1..20` and `session_questions.sequence_no` to `>= 1`.
- Added `topics.created_at`, `topics.updated_at`, and nullable `topics.difficulty_level`.
- Replaced `create_general_practice_session(user_id, topic_id, difficulty, question_ids[])` with `create_general_practice_session(user_id, topic_id, question_ids[])`.
- Updated `POST /api/practice/sessions` General body to `{ topicId, questionCount? }` with default `5`.
- Updated General question selection to draw only from the requested topic.
- Updated CSV import coverage to require five active General questions per topic.
- Updated worker STT/assessment gating to use `practice_sessions.question_count`.

## Verification

```powershell
npx vitest run src/app/api/practice/sessions/route.test.ts src/modules/practice/repository.test.ts src/modules/questions/general-selection.test.ts src/modules/topics src/worker/processors.test.ts scripts/import-questions-csv.test.mjs
npm test
npm run check
npm run questions:check
```

Apply `supabase/migrations/202609120001_topic_practice_question_count.sql` to the intended Supabase project before exercising the live RPC.

## Out of Scope

- UI changes for topic catalog or session start screens.
- IELTS guest flow and Part 1/1/2/3/3 selection.
- STT, assessment schema, queue architecture, and recommendation logic.
