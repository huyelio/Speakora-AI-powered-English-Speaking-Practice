# Speaking by Topic Pronunciation Assessment

**Goal:** Add basic, audio-based Lingolix pronunciation feedback to General Speaking results without changing the existing upload, queue, or database schema.

## Implementation

1. During a `GENERAL` STT job, reuse the downloaded answer audio and STT transcript as the Lingolix audio/reference pair. Persist only the normalized result under `transcripts.provider_metadata.pronunciation`; provider failures remain supplemental and do not fail Speaking processing.
2. Map stored normalized results to a compact session-level DTO: clear, needs attention, or unavailable, with at most three unique practice words and no learner-facing score.
3. Add the compact pronunciation card to the existing General criteria grid. Keep IELTS and Pronunciation Practice unchanged.
4. Cover worker orchestration, feedback mapping, result composition, and rendering with mocked-provider tests; update the implemented flow documentation.

## Constraints

- No migration, new job type, worker, endpoint, analytics, chart, or pronunciation session.
- Automated tests must not call Lingolix.
- Free-speaking feedback is supplemental because STT errors can produce an incorrect Lingolix reference text.
