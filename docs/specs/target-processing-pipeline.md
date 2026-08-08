# Target Processing Pipeline

## Relationship to the MVP

This document defines the long-term processing contract across IELTS, TOEIC Speaking, and General English. The implemented IELTS subset is documented in [Practice session flow](../architecture/practice-session-flow.md). Items labeled “target” below must not be assumed to exist.

## Inputs

- learner identity/profile when accounts are enabled;
- practice mode, part/type, topic, difficulty, and session configuration;
- versioned question content, timing, assets, and rubric;
- recorded answer audio and client metadata;
- provider, model, prompt, and analyzer versions.

## Outputs

- immutable audio reference and original transcript;
- quality flags and directly measured speech metrics;
- validated overall and criterion-level assessments;
- strengths, improvement actions, evidence, and next-practice suggestions;
- complete processing status, retry, and trace metadata.

## Pipeline Stages

1. **Select content:** validate mode/type filters, choose active content, and snapshot question and rubric versions.
2. **Prepare question:** return instructions/timing and generate or reuse authorized TTS audio.
3. **Record:** validate browser support, microphone permission, format, size, and useful duration.
4. **Persist:** store audio before creating durable answer/job state; use an idempotency key.
5. **Transcribe:** process stored audio asynchronously and retain the unedited original transcript.
6. **Analyze:** compute only defensible audio/transcript metrics and attach quality flags. This stage is target scope beyond duration in the current MVP.
7. **Build context:** combine snapshots, transcript, metrics, rubric version, and limitations without exposing secrets or chain-of-thought.
8. **Assess:** request strict structured output, validate score ranges and required fields, and retry transient/provider/schema failures.
9. **Publish:** save a traceable current result, preserve prior attempts where applicable, and return status/results to the UI.

## Mode-Specific Policy

- IELTS should use part-aware tasks and IELTS-aligned criteria. Pronunciation requires audio-derived evidence.
- TOEIC Speaking requires format-specific timing, replay policy, and shared stimuli.
- General English should score communicative appropriateness and level-aware language rather than presenting an exam band.

## State and Retry Requirements

Persist state independently from queue delivery. Jobs should distinguish queued, running, succeeded, retryable failure, and terminal failure. Claiming must be atomic, stale locks recoverable, retries bounded, and duplicate active work prevented per answer/session and job type.

Retrying STT must not create another answer. Retrying assessment must not overwrite audit history once multiple assessment attempts are supported. Provider error messages must be sanitized before storage or display.

## Traceability

Retain session, question snapshot/version, answer, audio object, transcript, metrics, assessment, provider/model, prompt version, rubric version, timestamps, attempts, latency, and cost metadata when available. Never store API keys, bearer tokens, signed URLs, or hidden model reasoning.

## Quality Gates

- Do not publish a score when required output is invalid.
- Warn or stop assessment when audio/transcript quality is insufficient.
- Do not silently rewrite the original transcript with an LLM.
- Separate measured facts from inferred feedback.
- Keep learner-facing uncertainty and pronunciation limitations explicit.
