# General Result Polish Implementation Plan

Goal: Improve the existing General result demo with word-practice reasons, compact pronunciation rows and guided inline self-practice, using stored Lingolix metadata only.

Approved approach: work in the current dirty checkout; preserve user changes. Keep ranking, thresholds, provider calls, database, result authorization, gamification and IELTS behavior unchanged.

- [x] Add failing tests for reason precedence, score-free projection, compact pronunciation feedback and General coaching/criteria fallbacks.
- [x] Add optional practiceReason to SpeakingPronunciationWord and derive it from the single ranked occurrence already selected.
- [x] Reuse one local word/syllable renderer in the pronunciation list and inline single-word self-practice; add bounded previous/next controls and focus restoration.
- [x] Remove General coaching items already shown in summary; add neutral missing-criteria feedback; scope visual changes to .general-result.
- [x] Verify focused tests, interactive DOM behavior if feasible, typecheck, full tests and production build. Check Browser availability without claiming visual QA when unavailable.
- [x] Update architecture documentation and request a focused read-only review.

Acceptance: At most three ranked words with understandable reasons; accurate per-syllable IPA/fallbacks; no numeric pronunciation score or invented word IPA; open practice at the first word, no wraparound, close returns focus; no practice network calls; answer audio remains explicitly loaded.

Excluded: re-recording, re-scoring, TTS, extra providers/queries, criterion rating heuristics, per-answer pronunciation, new dependencies, tables/services and unrelated refactors.

## Verification

- Focused pronunciation/result tests: 7 files, 41 tests passed (including tests discovered in the existing sibling worktree).
- Typecheck: npm run check passed.
- Full suite: npm test passed, 159 files and 658 tests.
- Production build: npm run build passed.
- Temporary jsdom harness outside the repository verified first-word opening, bounded navigation, focus restoration, reopen reset, single-word/unavailable states, zero self-practice requests, explicit-only answer audio loading and object URL cleanup. No project dependency was added.
- Focused read-only code review found no important or critical issues.
- Browser was unavailable; mobile/desktop visual QA and real browser keyboard behavior remain unverified. No live provider flow was exercised.

