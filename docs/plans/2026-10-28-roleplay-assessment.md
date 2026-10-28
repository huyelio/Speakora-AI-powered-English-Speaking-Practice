# Role-play assessment, rewards and history

Date: 2026-10-28. Status: done. The migration was checked in PGlite: capped credit, replay without a second award, daily goal and streak, too-short and not-ended guards, a learner without a profile, and XP surviving session deletion.

Ending an AI role-play showed only the turn count and goals. This plan adds feedback, XP and streak credit, and lists role-play sessions in history.

## Decisions (agreed with the learner-product owner)

- **No numeric band.** General English never shows an IELTS band. The result shows "x/y mục tiêu" plus 1–3 stars. Stars are computed from goals, not from the model:
  - 3 stars: every goal done.
  - 2 stars: at least half of the goals done.
  - 1 star: fewer than half.
  - No stars: fewer than 3 learner turns, because there is too little to judge.
- **Four criteria**, each with a level (Tốt / Khá / Cần luyện), a Vietnamese summary and an optional "bạn nói → nên nói" example: fluency and coherence, vocabulary, grammar, and **interaction** (answers what was asked, keeps the conversation going, asks back).
- **Transcript only.** Nothing about pronunciation. Every quoted `original` must appear in the learner's own turns, the same way `assessment/general-schema.ts` checks its examples.
- **Free stats** computed in code: learner turns, average words per turn, and questions the learner asked.
- **Rewards.** A role-play counts once its assessment is saved:
  - `CONVERSATION` XP event, 25 XP (same as a practice session), deduplicated by `CONVERSATION:<session id>`.
  - min(learner turns, 5) answers are credited to today's `daily_progress`. This can complete the daily goal, which updates the streak and grants the existing `DAILY_GOAL` 30 XP, with the same idempotency key as practice.
  - XP awarded is stored on the session (`reward_xp`), so the result screen can show it after a reload.
- **History.** `/history` lists role-play sessions next to practice sessions, newest first, with one shared keyset cursor. A role-play entry links to `/speaking/conversation?session=<id>`, which shows the saved result.

## Changes

- Migration `202610280001_conversation_assessment_rewards.sql`:
  - `conversation_sessions.assessment` (jsonb), `assessed_at` and `reward_xp`.
  - `xp_events.conversation_session_id`, plus the `CONVERSATION` event type and its amount in the checks.
  - RPC `save_conversation_assessment(session, user, assessment)` saves the first assessment and grants rewards in one transaction. Replays return the stored XP.
- `src/modules/conversation/assessment.ts`: the JSON schema, the parser and transcript check, the stars, the stats and the minimum turn count.
- `OpenAIConversationProvider.assess` uses `OPENAI_ASSESSMENT_MODEL`. One call per finished session, about $0.001.
- `assessConversation` service and `POST { action: "assess" }`. It returns the session unchanged when the session is not ended, is too short or is already assessed. One automatic retry runs when the model's quotes fail validation.
- Result screen:
  - stars, goals, turns and XP;
  - stat tiles;
  - criteria cards;
  - a lined "Nói tự nhiên hơn" card;
  - useful phrases.

  It shows "Đang nhận xét…" while waiting and a retry button on failure.
- History: `getHistory` merges both session kinds; the page renders a "Hội thoại" entry.

## Out of scope

Pronunciation feedback for role-play, recommendations from role-play results, dashboard "recent sessions" for role-play.

## Verification

`npm test`, `npm run check`, `npm run build`. The migration must be applied before deploying (the session query reads the new columns). Manual: finish a role-play with 3+ turns, see feedback and +XP, reload, confirm no second award; finish one with 1–2 turns and see the short-session message; open `/history`.
