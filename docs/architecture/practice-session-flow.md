# Practice Session Flow

## Session Creation

### Guest IELTS (unchanged)

1. The demo UI posts `{ "mode": "IELTS", "questionCount": 5 }` to `POST /api/practice/sessions`.
2. The server generates a random guest token and stores only its SHA-256 hash.
3. The selection module chooses two Part 1, one Part 2, and two Part 3 questions in that order. It prefers Part 3 questions sharing the Part 2 group, topic, or imported test-set code, then safely falls back to unrelated active Part 3 questions.
4. `create_ielts_practice_session` revalidates the five selected IDs and their order, then creates the session and versioned prompt snapshots in one transaction.
5. The raw token and ordered question DTOs return to the browser and are stored in `sessionStorage` for refresh recovery.

### Authenticated General (topic-based)

1. The learner UI posts `{ "topicId": "<uuid>", "questionCount": 5 }` (or omits `questionCount` to default to five) to `POST /api/practice/sessions`.
2. The server verifies the authenticated user and loads active General questions for the requested topic only. It does not borrow questions from other topics.
3. The selection module picks `questionCount` unique questions from that topic, preferring unseen questions and then least-recently answered ones.
4. `create_general_practice_session(user_id, topic_id, question_ids[])` revalidates the topic and selected IDs, stores `practice_sessions.question_count`, copies `topics.difficulty_level` onto the session when present, and creates immutable prompt snapshots in one transaction.
5. If the topic has fewer active questions than requested, the API returns HTTP `400` with a clear message.

General sessions accept `questionCount` from 1 to 20. IELTS guest sessions still require exactly five questions because of the fixed Part 1/1/2/3/3 structure.

The question list cannot change during the session even if question-bank records are edited later.

## Per-Question Interaction

1. The browser displays `Question n/5` and calls `POST /api/speech/tts` with the session and session-question IDs.
2. The API validates the bearer guest token, reads the authorized prompt snapshot, and generates MP3 audio through the AI gateway.
3. The browser attempts autoplay and exposes a manual play fallback if browser policy blocks it. It prefetches the next question audio.
4. A microphone button starts `MediaRecorder`; pressing it again stops recording.
5. The browser uploads WebM/Opus, MP4, or OGG audio with duration and an idempotency UUID.
6. The server validates ownership, type, and the 25 MB size limit, uploads the object, then calls `register_practice_answer` to create the answer and STT job atomically.
7. On HTTP `202`, the browser advances immediately. STT continues independently.

If upload fails, the browser retains the blob and idempotency key so the same answer can be retried without recording again.

## Background Processing

The worker calls `claim_processing_job`, which uses `FOR UPDATE SKIP LOCKED` to atomically claim one eligible job. Stale running jobs become claimable after five minutes.

For an `STT` job, the worker:

1. marks the answer `TRANSCRIBING`;
2. downloads the private audio object;
3. calls the configured transcription model in English;
4. for General sessions, sends the same audio plus the STT transcript as Lingolix reference text and stores only the normalized result under `transcripts.provider_metadata.pronunciation`;
5. upserts the original transcript and marks the answer `TRANSCRIBED`;
6. enqueues one `ASSESSMENT` job after all session answers are transcribed (`practice_sessions.question_count`).

General pronunciation analysis is supplemental and fail-soft: a missing key, provider error, 15-second timeout, empty transcript, or invalid response does not fail STT or the session assessment. A retried STT job reuses an existing normalized result when its reference text still matches, avoiding a duplicate provider call. IELTS remains transcript-only. Because free speaking has no known reference text, STT errors can also make the Lingolix reference inaccurate; the result UI therefore shows only a basic qualitative summary and at most three practice words, never a learner-facing pronunciation score or phoneme-level claim.

For an `ASSESSMENT` job, it orders all question/transcript pairs, sends one prompt through the Responses API with a strict JSON schema, validates the result again, saves the session assessment, and marks the session complete. The assessment explicitly does not claim to evaluate pronunciation from transcripts.

Jobs retry up to three attempts with exponential backoff. A terminal failure marks the related answer or session failed; `POST /api/practice/sessions/:sessionId/retry` resets failed jobs without requiring another upload.

## Status and Result APIs

| Endpoint | Behavior |
| --- | --- |
| `GET .../status` | Returns per-answer state, completed/failed counts, and assessment state. |
| `GET .../result` | Returns HTTP `202` while processing, then the structured assessment and ordered answer review data. |
| `GET .../answers/:answerId/audio` | Authorizes the guest bearer token and proxies bytes from private Storage. |
| `POST .../retry` | Requeues terminally failed jobs for the authorized guest session. |

The processing screen polls every three seconds. The Vietnamese result dashboard renders the AI-estimated band, short qualitative feedback for fluency/coherence, vocabulary, and grammar, strengths, improvements, next steps, and all original questions, audio, and transcripts. Each criterion may include at most one verbatim transcript example and an optional correction; the worker rejects evidence absent from the transcripts. General results also compose stored Lingolix metadata into basic audio-based pronunciation feedback; IELTS still discloses that pronunciation is unavailable.

## Important Failure Boundaries

- The Next.js request never runs STT or assessment as fire-and-forget work.
- The answer and initial job are created in one database RPC transaction after Storage upload.
- If registration fails, the API removes the newly uploaded object.
- Repeated submissions with the same idempotency key return the existing answer.
- AI keys and the Supabase service role never reach the browser.

## Word-level Pronunciation Practice

`/pronunciation` is a separate authenticated mode, linked from the dashboard and main navigation. Server pages load IPA-ready topic availability and owner-scoped session DTOs. The learner selects a topic, level, and 1–20 words (default 10), then practices each immutable word/IPA snapshot.

The card offers authorized word TTS, MediaRecorder capture (WebM/Opus, MP4, or OGG), local playback/re-recording, and explicit submission. Capture stops at 60 seconds. Local streams and object URLs are released on re-record, item change, and unmount. Upload failures preserve the local blob and idempotency key; expired authentication uses the existing in-page sign-in dialog. Leaving the page loses an unsent local recording.

Successful submissions reload the owned session before enabling Next, including idempotent responses containing only an attempt ID/status. Failed or processing responses carrying an attempt ID offer explicit stored-audio retry and result checking; there is no automatic provider retry. The API enforces the five-minute stale-processing retry threshold. Resuming a saved session selects the first item without a successful result. Once every item has succeeded, the final summary reports the latest successful scores and offers a new weak-word session using `{ selection: "WEAK", sourceSessionId }`.

Feedback consumes only normalized syllable data. Letter segments concatenate into the original heading only when conservative case-normalized spelling alignment succeeds and there are no missing/extra segments. Otherwise the word stays intact and segments appear separately. Keyboard-focusable segments expose accuracy, expected/detected IPA, and missing/extra flags; score bands also use different underline styles. Weak-practice selection follows domain rules (overall below 80, any syllable below 70, or missing/extra), which is broader than the overall WEAK score band (below 70).

The UI uses semantic CSS tokens, a maximum 720px card, responsive controls, and reduced-motion overrides. Local tests and builds do not verify deployed migrations, real microphone behavior, or live TTS/analysis/Storage integration.
