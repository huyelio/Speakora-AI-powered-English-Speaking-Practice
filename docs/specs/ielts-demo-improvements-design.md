# IELTS Demo Improvements Design

**Date:** 2026-08-08
**Status:** Approved by implementation request

## Goal

Improve the existing guest IELTS demo without changing its architecture: create IELTS-like 2/1/2 sessions, return secure answer review data, and render a Vietnamese result dashboard with honest transcript-only assessment boundaries.

## Question Selection

Load active IELTS candidates with their question type, group, topic, and code. A pure selector chooses two distinct Part 1 questions, one Part 2 cue card, and two distinct Part 3 questions in that order. For the Part 3 pair it prefers, in order, the selected Part 2 question's non-null `group_id`, `topic_id`, then encoded test-set key such as `T01`. If fewer than two related questions exist, it fills from all remaining Part 3 candidates. Insufficient candidates fail session creation without partial data.

The server passes the five selected IDs to a PostgreSQL RPC. The RPC validates the exact type/order/uniqueness contract against active IELTS rows and creates the session plus immutable snapshots atomically.

## Assessment

Extend structured output with qualitative `criteria` feedback for `fluency_coherence`, `lexical_resource`, and `grammatical_range_accuracy`. Do not produce numeric criterion scores because transcripts alone do not support complete IELTS criterion scoring. Keep the overall band clearly labeled as an AI estimate. Pronunciation is intentionally absent from the model schema and is always rendered as “Phát âm — Chưa đánh giá trong phiên bản hiện tại” with an audio-analysis explanation.

## Answer Review and Audio

The authorized result response includes all five ordered answers with session-question ID, answer ID, question type, original English prompt, original STT transcript, and a session-scoped audio endpoint. The endpoint validates the existing bearer guest token and verifies that the answer belongs to that session before streaming bytes from the private bucket. It never exposes a service key, public object URL, or public bucket.

## UI

Practice screens map question types to Vietnamese labels for Part 1 warm-up, Part 2 long turn, and Part 3 discussion. The result dashboard presents band estimate, qualitative criteria, strengths, improvements, next steps, the fixed pronunciation limitation, and an expandable “XEM LẠI CÂU TRẢ LỜI” list with English questions, audio controls, and original transcripts. Processing uses only returned answer/assessment states.

## Verification

Use TDD for selection, assessment validation, and audio authorization. Verify correct ordering, uniqueness, related and fallback selection, token authorization, private playback decisions, transcript-bearing result contracts, schema validity, and absence of pronunciation scoring. Run the full repository verification commands after focused tests pass.
