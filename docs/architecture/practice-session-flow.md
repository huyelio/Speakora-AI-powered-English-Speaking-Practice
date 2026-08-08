# Practice Session Flow

## Session Creation

1. The UI posts `{ "mode": "IELTS", "questionCount": 5 }` to `POST /api/practice/sessions`.
2. The server generates a random guest token and stores only its SHA-256 hash.
3. The selection module chooses two Part 1, one Part 2, and two Part 3 questions in that order. It prefers Part 3 questions sharing the Part 2 group, topic, or imported test-set code, then safely falls back to unrelated active Part 3 questions.
4. `create_ielts_practice_session` revalidates the five selected IDs and their order, then creates the session and versioned prompt snapshots in one transaction.
5. The raw token and ordered question DTOs return to the browser and are stored in `sessionStorage` for refresh recovery.

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
4. upserts the original transcript and marks the answer `TRANSCRIBED`;
5. enqueues one `ASSESSMENT` job after all five answers are transcribed.

For an `ASSESSMENT` job, it orders all question/transcript pairs, sends one prompt through the Responses API with a strict JSON schema, validates the result again, saves the session assessment, and marks the session complete. The assessment explicitly does not claim to evaluate pronunciation from transcripts.

Jobs retry up to three attempts with exponential backoff. A terminal failure marks the related answer or session failed; `POST /api/practice/sessions/:sessionId/retry` resets failed jobs without requiring another upload.

## Status and Result APIs

| Endpoint | Behavior |
| --- | --- |
| `GET .../status` | Returns per-answer state, completed/failed counts, and assessment state. |
| `GET .../result` | Returns HTTP `202` while processing, then the structured assessment and ordered answer review data. |
| `GET .../answers/:answerId/audio` | Authorizes the guest bearer token and proxies bytes from private Storage. |
| `POST .../retry` | Requeues terminally failed jobs for the authorized guest session. |

The processing screen polls every three seconds. The Vietnamese result dashboard renders the AI-estimated band, short qualitative feedback for fluency/coherence, vocabulary, and grammar, strengths, improvements, next steps, and all original questions, audio, and transcripts. Each criterion may include at most one verbatim transcript example and an optional correction; the worker rejects evidence absent from the transcripts. Pronunciation is explicitly unavailable because it requires direct audio analysis.

## Important Failure Boundaries

- The Next.js request never runs STT or assessment as fire-and-forget work.
- The answer and initial job are created in one database RPC transaction after Storage upload.
- If registration fails, the API removes the newly uploaded object.
- Repeated submissions with the same idempotency key return the existing answer.
- AI keys and the Supabase service role never reach the browser.
