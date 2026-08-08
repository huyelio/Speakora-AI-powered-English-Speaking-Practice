# Functional Requirements

## Status Vocabulary

- **Implemented:** present in the five-question guest IELTS flow.
- **Partial:** supporting data or an earlier demo exists, but the full requirement is incomplete.
- **Planned:** stable product intent not implemented in the current repository.

## Cross-Cutting Rules

- Questions must come from the active reviewed question bank and match their practice mode/type.
- AI work starts only after audio storage and answer registration succeed.
- AI output must pass a defined schema before it is stored or shown.
- Provider failure must not delete the learner's stored answer and must support retry.
- Pronunciation cannot be scored from transcript text alone.
- Measured values and AI-generated judgments must be presented as different evidence classes.

## Accounts and Profiles

| ID | Requirement | Status |
| --- | --- | --- |
| FR-AUTH-01 | Register an account. | Planned |
| FR-AUTH-02 | Log in and log out. | Planned |
| FR-PROFILE-01 | Manage a basic learning profile. | Planned |

The current MVP uses an unguessable guest session token instead of user authentication.

## Practice Selection and Questions

| ID | Requirement | Status |
| --- | --- | --- |
| FR-PRACTICE-01 | Select a practice mode. | Partial; current flow is IELTS-only |
| FR-PRACTICE-02 | Select a part or question type. | Planned |
| FR-PRACTICE-03 | Load active questions from the question bank. | Implemented |
| FR-PRACTICE-04 | Display instructions and configured timing. | Partial |

For the implemented MVP, session creation selects exactly two Part 1, one Part 2, and two Part 3 active IELTS questions in that order and keeps immutable prompt snapshots. Part 3 questions should relate to Part 2 by group, topic, or imported test set when the bank supports it; distribution and uniqueness take priority over relation.

## TTS, Recording, and Upload

| ID | Requirement | Status |
| --- | --- | --- |
| FR-TTS-01 | Generate question audio. | Implemented |
| FR-TTS-02 | Provide playback controls/fallback. | Implemented |
| FR-AUDIO-01 | Request microphone permission and explain denial. | Implemented |
| FR-AUDIO-02 | Record a spoken answer. | Implemented |
| FR-AUDIO-03 | Review and re-record before submission. | Deferred by MVP flow |
| FR-AUDIO-04 | Validate and persist answer audio. | Implemented |

Supported uploads are WebM/Opus, MP4, and OGG up to 25 MB. Stopping recording submits the answer immediately; a failed upload retains the browser blob for retry.

## Transcription and Analysis

| ID | Requirement | Status |
| --- | --- | --- |
| FR-STT-01 | Convert stored audio to English transcript asynchronously. | Implemented |
| FR-STT-02 | Make transcripts available to the result/history experience. | Implemented in the current result UI |
| FR-STT-03 | Flag unusable or low-confidence transcripts. | Planned |
| FR-ANALYSIS-01 | Compute duration, word count, rate, pause, and quality metrics. | Duration only |
| FR-ANALYSIS-02 | Build a traceable assessment context. | Implemented for question/transcript pairs |

Realtime transcription is outside the current MVP.

## Assessment and Results

| ID | Requirement | Status |
| --- | --- | --- |
| FR-ASSESS-01 | Select a versioned mode-specific rubric. | Planned |
| FR-ASSESS-02 | Produce schema-validated structured assessment output. | Implemented at session level |
| FR-ASSESS-03 | Attach evidence to criterion feedback. | Planned |
| FR-ASSESS-04 | Provide actionable improvement guidance. | Implemented |
| FR-ASSESS-05 | Retry failed assessment without re-upload. | Implemented |
| FR-RESULT-01 | Show detailed results. | Implemented for the current session, including answer review |
| FR-RESULT-02 | Distinguish measured data from AI judgment. | Implemented for the current transcript-only assessment |

The current result includes an AI-estimated IELTS band; overall feedback; qualitative transcript-based fluency/coherence, vocabulary, and grammar feedback; strengths; improvements; next steps; and an explicit pronunciation limitation. It also exposes the five original English questions, authorized private audio playback, and original STT transcripts. It does not invent per-answer feedback.

## History, Progress, and Administration

| ID | Requirement | Status |
| --- | --- | --- |
| FR-HISTORY-01 | Persist practice history. | Data persists, but no account ownership/history UI |
| FR-HISTORY-02 | Browse prior attempts. | Planned |
| FR-PROGRESS-01 | View basic progress trends. | Planned |
| FR-ADMIN-01 | Add and edit questions. | Import tooling only |
| FR-ADMIN-02 | Activate or hide questions. | Data model/import tooling only |
| FR-ADMIN-03 | Manage versioned rubrics. | Planned |

## Mock Tests and Extensions

| ID | Requirement | Status |
| --- | --- | --- |
| FR-MOCK-01 | Start a configured mock test. | Planned |
| FR-MOCK-02 | Coordinate ordered sections and timing. | Planned |
| FR-MOCK-03 | Produce a complete test result. | Planned |
| FR-EXT-01 | Collect onboarding goals, interests, level, and study time. | Future |
| FR-EXT-02 | Recommend a personalized path from history and recurring weaknesses. | Future |
| FR-EXT-03 | Hold a contextual realtime AI conversation. | Future |
| FR-EXT-04 | Generate or select remedial exercises for detected weaknesses. | Future |
| FR-EXT-05 | Add streaks, badges, weekly goals, and experience points. | Future |
| FR-EXT-06 | Provide an administration dashboard for learners, attempts, service failures, and cost. | Future |
| FR-EXT-07 | Let teachers review attempts and add feedback. | Future |

## MVP Acceptance

A guest can complete five fixed IELTS questions without leaving the application; each audio file is private and durable; STT and assessment run outside web requests; failed work can be retried; exactly one structured session assessment is stored; and refresh recovery retains access to the active session.
