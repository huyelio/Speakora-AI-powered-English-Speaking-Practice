# General Practice Result Implementation Plan

Approved scope: improve the General result demo using stored Lingolix metadata only. Preserve IELTS, existing authorization, worker/provider calls, database schema and gamification. Work in the current checkout to preserve the existing uncommitted UI improvements; do not commit unrelated work.

## Tasks

- [x] Extend the pronunciation presentation DTO with status, analyzed/total answer counts and up to three words with safe syllable/IPA details. Keep existing available/summary/practiceWords fields.
- [x] Rank attention words by missing/extra syllables, lowest word/syllable accuracy, attention syllable count, then original order. Deduplicate after ranking; keep a single occurrence's details. Preserve existing thresholds and tolerate absent display fields.
- [x] Reuse the existing metadata query with left joins to include unanswered/unanalysed questions. No additional queries or provider calls.
- [x] Render General-specific completion summary, prominent pronunciation card with inline self-practice, criteria, grouped coaching, useful phrase, compact progress and closed answer accordions. Do not modify IELTS rendering.
- [x] Test ranking, boundaries, malformed/partial data, repository coverage, DTO projection, render order, disclosures and route authorization. Run focused tests, typecheck, full tests and production build; check browser interactions if an attached browser is available.
- [x] Update architecture documentation and review the focused changes.

## Verification notes

Focused data/UI tests were observed failing before their implementation, then passing. Source review approved the data projection and General UI. Full tests pass (153 files / 627 tests, including the existing sibling worktree tests) and typecheck passes. Production build passes with isolated output under `.next/general-result-build` to avoid the running development server's shared `.next` cache. The temporary verification helper was removed and build-generated TypeScript config changes restored; no runtime/config source changes were retained. The development server was restarted after the initial shared-cache build disrupted it; `/demo/speech` returned HTTP 200 afterward. The background worker was not restarted or changed.

The browser runtime reported no available browser. Mouse/keyboard interactions, real responsive screenshots, microphone and live provider flows were not verified. Static render tests cover closed disclosures, correct controls/targets, coverage/IPA fallbacks and preserved IELTS markup.

## Interface

SpeakingPronunciationFeedback retains available, summary and practiceWords and adds status (CLEAR/ATTENTION/UNAVAILABLE), analyzedAnswerCount, totalAnswerCount and wordDetails. Word details contain word and syllables; syllables contain text, expectedIpa, detectedIpa, status, isMissing and isExtra. No raw numeric pronunciation data is exposed.

## Acceptance and exclusions

The top of the page shows completion, an existing strength, an existing improvement and recommended words. Pronunciation details and answer review use progressive disclosure. Self-practice has no recording or assessment request. Preserve Speakora light/dark tokens and responsive design.

No new scoring/rating, synthetic word IPA, provider request, service, table, dependency, per-answer pronunciation, waveform, word-bank integration or unrelated pronunciation-attempt fix.
