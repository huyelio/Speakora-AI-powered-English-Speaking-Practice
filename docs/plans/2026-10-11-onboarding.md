# Onboarding demo implementation plan

Approved scope: reuse existing UI, profile tables, topics, practice pipeline and provider. No dependencies or new services.

- [x] Update the existing wizard: Vietnamese CEFR cards A1–C2/unknown, seven goals, IELTS 5–9 in 0.5 steps, 5/10/15/20/30 minutes, existing topic multi-select.
- [x] Hide timezone input; detect it automatically. Keep the existing timezone and legacy difficulty/answer-goal machinery compatible.
- [x] Add only current_level, level_source, target_score, preferred_topics to profiles and daily_goal_minutes to learning_goals. Reuse learning_purpose and onboarding_completed_at.
- [x] Save drafts without completing onboarding. Enforce unknown-level check completion on the server; allow self-reported CEFR to skip.
- [x] Reuse General practice with session_kind QUICK_CHECK and three ordered bank questions: easy warm-up, preferred topic, harder opinion. Reuse recording, upload, STT, jobs, retry and storage.
- [x] Add compact CEFR/feedback/recommendation assessment in existing JSON storage; no scores, long rubric, pronunciation calls or check rewards.
- [x] Update Profile fields and add a development-only reset using the existing profile API. Server rejects production and unauthenticated requests; only onboarding completion state is reset.
- [x] Test validation, required/optional check, ownership, production reset denial, worker and practice regressions. Run full tests, typecheck and build.
- [ ] Live microphone/Storage/worker/OpenAI and browser visual QA require a connected browser and applied migration; not exercised in this session.

Files: onboarding page/form, profile types/validation/repository/API/form/page, practice types/repository/session/API, AI gateway, worker, small assessment schema, one SQL migration and focused tests. Update relevant architecture notes briefly.
