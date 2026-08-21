# Personalized General Speaking and Daily Learning Design

**Date:** 2026-08-21
**Status:** Approved in design review; awaiting written-spec review

## Goal

Turn Speakora from a single guest IELTS demo into a coherent learning product. An authenticated learner can choose an everyday English topic, complete a five-question speaking session, receive mode-appropriate AI feedback, make progress toward a daily question goal, maintain a streak, earn XP, and revisit prior sessions.

This increment must preserve the durable upload, background STT, assessment, retry, and private-audio guarantees of the existing IELTS flow. TOEIC speaking and dynamic AI conversation remain outside this increment.

## Product Scope

The primary journey is:

```text
Register or sign in
  -> complete onboarding
  -> view dashboard
  -> choose a topic
  -> answer five prepared questions
  -> receive AI feedback
  -> update daily goal, streak, and XP
  -> receive a next-topic recommendation
```

The increment includes:

- Supabase Auth with email and password, sign-out, and password recovery.
- A learner profile and onboarding for display name, self-assessed level, learning purpose, and daily question goal.
- A dashboard centered on today's goal, streak, XP/level, recommended topics, and recent sessions.
- A searchable and filterable General English topic catalog.
- Five-question General English sessions using prepared, reviewed questions.
- Mode-specific assessment that does not present an IELTS band for General English.
- Persisted history with authorized transcript and audio review.
- Server-authoritative daily progress, streaks, XP, and rule-based recommendations.
- Continued access to IELTS practice as a distinct mode.

The increment explicitly excludes Google OAuth, realtime or branching AI conversation, leaderboards, social features, pronunciation scoring, content administration UI, and functional TOEIC sessions. A TOEIC card may be shown as disabled and labeled "Coming soon," but it must not lead to a simulated or incomplete practice route.

## Experience Design

### Application shell

Authenticated screens use a consistent application shell: a sidebar on desktop and bottom navigation on mobile. The current green identity remains, while mode accents distinguish friendly, situational General English from exam-oriented IELTS. Cards, restrained illustrations, clear progress states, and responsive spacing replace the current single-demo-page presentation.

Primary navigation contains Home, Explore, History, and Profile. IELTS and General English are entry points within the learning experience rather than separate products.

### Authentication and onboarding

Authentication uses Supabase email/password flows:

- register;
- sign in;
- sign out;
- request password recovery;
- complete password recovery;
- handle email confirmation when it is enabled in the Supabase project.

After first authentication, an incomplete profile redirects to a three-step onboarding flow:

1. display name and self-assessed level (`BEGINNER`, `INTERMEDIATE`, or `ADVANCED`);
2. primary learning purpose;
3. daily target measured in completed answers.

Until onboarding is complete, authenticated users cannot start a new owned practice session. Existing guest IELTS session recovery remains supported independently.

### Dashboard

The dashboard leads with a visible daily-goal indicator such as `6/10 answers`, the current streak, and one primary "Practice now" action. It also shows:

- total XP and derived level;
- the next recommended topics with short reason labels;
- a General English entry point;
- an IELTS practice entry point;
- recent completed or processing sessions;
- a disabled TOEIC "Coming soon" card if product presentation benefits from it.

The mobile layout puts the goal and primary practice action above secondary statistics. Complex charts are deferred until there is enough historical data to make them useful.

### Topic discovery and detail

Explore supports search, level filters, and topic groups such as Daily Life, Travel, Work, Social, and Health. Each topic card shows an icon, name, short description, available question count, difficulty availability, and learner completion state.

A topic detail page explains the speaking context, shows a small optional vocabulary preview, indicates available levels and question count, and starts a five-question session. It does not expose the entire question list before practice.

### Practice and results

The practice screen reuses the proven lifecycle: play the prepared prompt through TTS, record an answer, persist audio, run STT in the worker, and assess after all answers are transcribed. It adds an explicit review step so a learner can listen and re-record before submitting. After submission, the persisted answer is immutable for that session question.

The result screen includes:

- a General English summary, without an IELTS band;
- transcript-supported fluency/coherence, vocabulary, and grammar feedback;
- concrete corrections whose source text exists in the transcripts;
- a useful phrase or more natural alternative for the next attempt;
- strengths and next actions;
- earned XP and updated daily-goal/streak state;
- a reasoned next-topic recommendation;
- authorized answer audio and original transcripts.

The UI states that pronunciation is not evaluated because the assessment does not analyze audio signals directly. IELTS results retain their existing estimated-band framing and assessment contract.

### History and profile

History lists owned sessions by date, mode, topic, status, and summary result. A learner can reopen a completed session to review its protected audio, transcripts, and feedback. Processing or failed sessions expose their real state and the existing retry behavior.

Profile allows changes to display name, level, learning purpose, timezone, and daily question target. It shows current and longest streak, total XP, and derived level.

## Content Design

General English content is stored separately from the IELTS source CSV and imported through the existing question-bank tooling. The initial catalog contains 15 everyday topics with 12 prepared questions each, for 180 questions total:

1. Daily Routine
2. Family & Friends
3. Food & Cooking
4. Shopping
5. Travel
6. Transportation
7. Work
8. Study
9. Hobbies
10. Movies & Music
11. Health & Fitness
12. Technology
13. Home & Neighborhood
14. Social Situations
15. Future Plans

Every row includes a stable code, `GENERAL` mode, an existing General question type, topic slug and name, prompt, difficulty, status, timing configuration where needed, and provenance metadata. Content is original and reviewed before being marked `ACTIVE`.

The initial distribution should provide meaningful coverage across all three levels. A topic/level combination must have at least five active questions before the UI offers it as selectable. This prevents a learner from selecting a session the server cannot create.

For each session, the selector chooses five unique active questions for the requested topic and level. It first excludes questions answered by that learner in their most recent General English sessions. If fewer than five unseen candidates remain, it fills from the least recently answered eligible questions. The selected questions are snapshotted in fixed order as they are for IELTS.

## Architecture

The system remains a TypeScript modular monolith with a Next.js App Router web process, a TypeScript worker, Supabase PostgreSQL and private Storage, and AI providers behind the existing gateway interfaces. No new runtime service or queue is introduced.

Responsibilities are separated into focused modules:

- `auth/profile`: authenticated-user lookup, onboarding state, and profile DTOs;
- `topics`: topic catalog queries and availability summaries;
- `questions`: pure General English selection policy;
- `practice`: session ownership, question snapshots, answer registration, result access, and guest compatibility;
- `progress`: daily counters, streak transitions, XP events, and levels;
- `recommendations`: deterministic ranking and human-readable recommendation reasons;
- `assessment`: separate IELTS and General English schemas and validation.

HTTP handlers remain thin. Database mutations that must update multiple progress records atomically use SQL functions in migrations. The worker continues to claim durable jobs and calls the correct assessment policy based on the session mode.

## Data Model

All database changes are introduced through SQL migrations.

### Profiles and goals

`profiles` extends `auth.users` one-to-one and contains:

- `user_id` primary/foreign key;
- `display_name`;
- `level` constrained to the three supported levels;
- `learning_purpose`;
- `timezone`, stored as an IANA timezone name and defaulted from onboarding;
- `onboarding_completed_at`;
- timestamps.

`learning_goals` contains one current row per user with a positive `daily_answer_target` and timestamps. A default target is offered by the UI, but the user explicitly confirms it during onboarding.

### Owned practice sessions

`practice_sessions` is generalized without removing guest compatibility:

- `user_id` is nullable and references `auth.users`;
- `guest_token_hash` becomes nullable;
- exactly one ownership mechanism is required for newly created sessions;
- `mode` supports at least `IELTS` and `GENERAL`;
- `topic_id` is nullable for modes that do not require a single topic;
- `difficulty_level` records the selected General level;
- `session_kind` distinguishes full IELTS practice from topic practice.

Existing guest IELTS sessions remain authorized by bearer-token hash. New authenticated sessions are authorized by the Supabase user identity. Session question snapshots, answers, transcripts, jobs, and assessments continue to provide the durable processing record.

### Progress and rewards

`daily_progress` stores one row per user and learner-local date, with a completed-answer count and goal-achieved timestamp. The local date is calculated server-side using the timezone stored on the profile at the time of the event.

`xp_events` is an append-only ledger containing user, event type, amount, related session or answer, idempotency key, and creation time. A unique idempotency key prevents retry from awarding XP twice. Total XP is the sum of ledger entries; level is derived from documented thresholds rather than stored as a second mutable total.

`user_streaks` stores current streak, longest streak, last goal-achieved local date, and update time. It is updated only when a daily goal crosses from incomplete to achieved.

The answer-registration transaction increments daily progress and awards answer XP once for a newly registered answer. Completing an assessment awards the session-completion XP and, when applicable, the first-topic-completion bonus once. Crossing the daily target awards a daily-goal bonus once and updates the streak in the same database transaction.

### Streak rules

- Progress is measured in successfully registered answers, not recording duration.
- Multiple answers on the same local date contribute to the same daily row.
- Reaching the goal more than once on one date does not increment the streak again.
- If the previous achieved-goal date is yesterday, reaching today's goal increments the streak.
- If it is today, the streak is unchanged.
- If it is earlier than yesterday or absent, reaching today's goal sets the current streak to one.
- A missed day is reflected as a zero current streak in reads after the missed day, even before the next practice event; the stored streak is reconciled on the next goal achievement.
- Changes to a daily target apply prospectively and do not rewrite previously achieved days.

XP rules for this increment are intentionally simple and visible to the learner:

- `10 XP` for each successfully registered answer;
- `25 XP` when a five-question session assessment completes;
- `30 XP` the first time the learner reaches the daily goal on a local date;
- `20 XP` the first time the learner completes a General English topic at any level.

Each award has its own unique ledger key. A completed five-question session that also completes a new topic and crosses the daily goal therefore awards 125 XP in total: 50 answer XP, 25 completion XP, 20 topic XP, and 30 daily-goal XP. Level is `floor(total_xp / 250) + 1`, so every 250 XP advances one level. These values are product constants with unit tests and are not user-editable database configuration in this increment.

## Assessment and Recommendations

General English uses a separate schema and prompt from IELTS. It evaluates communicative clarity, transcript-supported fluency/coherence, lexical resource/naturalness, and grammatical range/accuracy. It returns actionable corrections, one useful phrase or natural alternative, strengths, and next actions. It must not return an IELTS band or a pronunciation score.

Structured output is validated before storage. Verbatim evidence and correction originals must be found in the stored transcripts, following the existing evidence-validation principle.

Recommendations are deterministic for this increment. Candidate topics are ranked by:

1. compatibility with the learner's current level;
2. not being the topic of the most recently completed session;
3. not yet practiced or least recently practiced;
4. relevance to recurring vocabulary or grammar improvement tags from the two most recent completed sessions;
5. stable tie-breaking for predictable tests.

If the learner has performed strongly in consecutive sessions at the current level, the recommendation may propose the next level. Each recommendation includes a short reason such as "Suitable for Intermediate" or "Practice vocabulary for workplace conversations." No opaque claim of AI personalization is made when the recommendation is rule-based.

## Authorization and Security

RLS is enabled for all learner-owned tables. Authenticated users can read and update only their own profile and goal, read only their own progress/reward/history records, and access only their own practice artifacts. Question-bank catalog reads expose only active content required by the UI.

Server routes derive authenticated identity from the Supabase session and never accept a client-supplied user ID as authority. Worker and trusted server operations use the service role. Existing raw guest tokens remain browser-only, and private answer audio continues to be streamed through an authorized route rather than a public Storage URL.

Secrets, access/refresh tokens, raw audio, and bearer tokens must not be logged. No `SECRET_KEY` or AI provider key may enter client code or a `NEXT_PUBLIC_` variable.

## Failure Handling

- Auth screens map expected Supabase errors to concise, safe messages without exposing provider internals.
- Protected routes redirect unauthenticated users to sign-in with an intended return path.
- If authentication expires while an answer is pending, the browser retains the unsent recording in memory, requests reauthentication, and permits retry after the session is restored. A page close may still discard an unsubmitted browser blob, and the UI must say so.
- The server does not show progress, XP, or streak rewards until the authoritative transaction succeeds.
- Answer, job, progress, and reward mutations are idempotent.
- STT or assessment failure preserves stored audio and supports the current retry path.
- Dashboard, catalog, history, and result screens have explicit loading, empty, retryable-error, and terminal-error states.
- If a topic lacks five eligible active questions, session creation fails without partial data and that topic/level is not advertised as available.

## Testing and Verification

Focused automated tests cover:

- email/password auth integration boundaries and protected-route behavior;
- profile onboarding validation;
- RLS isolation between two authenticated users;
- five-question topic/level selection, uniqueness, recent-question exclusion, and least-recent fallback;
- authenticated ownership and continued guest IELTS authorization;
- local-date calculation and timezone boundaries;
- daily target crossing, current/longest streak transitions, target changes, and missed days;
- XP event idempotency and derived level thresholds;
- General English assessment schema, evidence validation, and absence of IELTS/pronunciation scores;
- recommendation ordering and reason labels;
- history/result authorization and private audio access;
- end-to-end state transitions from session creation through worker completion and progress display.

Before completion, run focused tests, `npm run questions:check`, `npm run check`, the full `npm test`, and `npm run build`. Exercise the real Supabase migration, Auth, worker, and external AI flow when credentials and infrastructure are available. Any external path not actually exercised must be reported as unverified.

Manual responsive checks cover desktop and mobile navigation, onboarding, microphone permissions, recording review/re-record, processing states, results, and expired-session recovery.

## Acceptance Criteria

The increment is accepted when:

1. A learner can register with email/password, complete onboarding, sign out, and sign back in.
2. The dashboard displays server-backed daily goal, streak, XP/level, recommendations, and recent activity.
3. The catalog offers only topic/level combinations with at least five active prepared questions.
4. A learner can complete a five-question General English topic session through durable upload, background STT, and mode-appropriate assessment.
5. Successful answer registration updates daily progress exactly once; session completion and daily-goal crossing award XP exactly once.
6. Streak behavior follows learner-local dates and the documented missed-day rules.
7. The completed session appears in history with authorized transcript, feedback, and private audio review.
8. User-owned data and audio are isolated by authenticated identity and RLS, while existing guest IELTS recovery still works.
9. General English results contain neither an IELTS band nor a pronunciation score.
10. TOEIC and dynamic AI conversation are not exposed as functioning capabilities.

## Delivery Boundary

This design is one implementation increment, but its plan should be staged so the repository remains testable after each milestone: schema/auth foundation, content and selection, owned practice flow, progress/rewards, dashboard/history, and final integration/verification. Visual polish must not bypass security, idempotency, or durable processing guarantees.
