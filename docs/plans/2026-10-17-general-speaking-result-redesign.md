# General Speaking Result Redesign Implementation Plan

**Goal:** Reorganize the existing General Speaking result into a learner-first summary, one priority action, focused pronunciation practice, readable delivery feedback, and concise language coaching without changing backend data.

**Scope:** General Topic results only. IELTS, Quick Check, Azure/STT/assessment logic, APIs, and persistence remain unchanged.

## Tasks

- [x] Add focused rendering tests for the hero, three qualitative statuses, exactly one priority action, and the absence of system-oriented labels.
- [x] Add focused pronunciation tests for a closed-by-default list of at most three weak words with retained syllable/IPA evidence and practice controls.
- [x] Restructure `result-view.tsx` using only current assessment and pronunciation fields.
- [x] Simplify `general-pronunciation-card.tsx` and preserve keyboard-accessible disclosure and self-practice behavior.
- [x] Update only General result styles in `globals.css`, using existing theme tokens, responsive breakpoints, and reduced-motion behavior.
- [x] Run the focused tests, `npm run check`, and the production build.

## Data limitations

- Do not render a pause timeline because the result DTO contains pause counts but no pause positions.
- Do not create vocabulary alternatives beyond `example.corrected`; the assessment schema provides at most one correction.
- Do not infer additional grammar, vocabulary, or pronunciation claims from transcript text in the UI.
