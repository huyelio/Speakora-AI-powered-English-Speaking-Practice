# Product Overview

## Vision

Speakora is an AI-assisted English speaking practice system intended to support IELTS Speaking, TOEIC Speaking, and General English. It uses a reviewed question bank, recorded speech, transcription, measurable speech signals where available, and rubric-aware AI feedback.

The product addresses a common gap for learners who can record themselves but lack structured, repeatable feedback. Questions should be stable and reviewable rather than generated ad hoc, and results should distinguish measured facts from model inference.

## Audiences

- Learners preparing for IELTS or TOEIC Speaking or improving practical spoken English.
- Content administrators managing questions, topics, formats, sources, and rubrics.
- Future educators or reviewers evaluating content and learner progress.

## Implemented MVP

The current repository implements one complete guest IELTS flow:

1. create a session with five random active IELTS questions;
2. keep versioned question snapshots fixed for the session;
3. play each question with TTS;
4. record and upload one answer per question;
5. transcribe answers asynchronously;
6. assess all five transcripts together;
7. display an estimated band, overall feedback, strengths, improvements, and next steps.

The assessment is transcript-based and does not claim to score pronunciation. See [the current architecture](../architecture/overview.md) for implemented details.

## Long-Term Product Scope

- Dedicated IELTS Part 1, Part 2, Part 3, and full mock-test experiences.
- TOEIC Speaking formats with their own timing, stimuli, and rubrics.
- General English topics, levels, and role-play scenarios.
- Accounts, learning profiles, practice history, and progress views.
- Rubric versions and criterion-level evidence.
- Audio-derived fluency and pronunciation analysis where technically valid.
- Content administration, publishing workflow, and source provenance.
- Adaptive question selection and personalized practice recommendations.

## Product Principles

- Use reviewed question-bank content and preserve the version used in each session.
- Persist audio before starting asynchronous AI work.
- Make processing retryable and idempotent.
- Validate structured model output before publication.
- Never infer pronunciation quality solely from a transcript.
- Keep model, prompt, rubric, source, and processing metadata traceable.
- Treat AI scores as estimates and communicate limitations to learners.

## Explicitly Deferred Capabilities

Realtime conversation, realtime transcription, streaming feedback, word-level pronunciation analysis, native mobile applications, teacher marketplaces, gamification, social matching, and a data warehouse are not part of the current MVP.
