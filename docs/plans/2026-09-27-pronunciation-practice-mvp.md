# Pronunciation Practice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the provider-neutral analysis and durable authenticated persistence foundation for word-level Pronunciation Practice before adding API routes or learner UI.

**Architecture:** Lingolix responses are parsed into a versioned provider-neutral result. A separate pronunciation domain snapshots IPA-ready vocabulary items into owned sessions and stores retryable private-audio attempts; service-role-only RPCs enforce atomic creation, registration, and completion while the server-only repository performs authorization-scoped reads and lifecycle transitions.

**Tech Stack:** Next.js 15 App Router, strict TypeScript, Vitest, Supabase PostgreSQL/Storage, PL/pgSQL.

## Global Constraints

- Keep provider calls and the Supabase service key server-only.
- Standard sessions contain 10 randomly selected unique items; database creation accepts 1–20.
- Items must be ACTIVE, match the requested General topic and level, and have nonblank IPA.
- Score bands are `GOOD >= 85`, `PRACTICE >= 70`, and `WEAK < 70`.
- A weak item has overall accuracy below 80, a syllable below 70, or a missing/extra syllable.
- Failed attempts never replace the latest completed result.
- Do not add API routes or learner UI in this phase, and do not claim live provider/database verification.

---

### Task 1: Provider-neutral pronunciation analysis

**Files:**

- Create: `src/modules/pronunciation-analysis/types.ts`
- Create: `src/modules/pronunciation-analysis/schema.ts`
- Create: `src/modules/pronunciation-analysis/service.ts`
- Create: `src/modules/pronunciation-analysis/lingolix.ts`
- Test: `src/modules/pronunciation-analysis/schema.test.ts`
- Test: `src/modules/pronunciation-analysis/lingolix.test.ts`

**Interfaces:**

- Produces: `PronunciationAnalysisResult`, strict Lingolix parsing, and a server-only analysis service returning normalized 0–100 scores.

- [x] Write failing parser and adapter tests using a sanitized response fixture.
- [x] Implement strict provider parsing, nullable internal timing/rate/IPA fields, and safe fixed errors.
- [x] Verify the focused analysis suites and TypeScript check.

### Task 2: Pronunciation persistence and domain

**Files:**

- Create: `supabase/migrations/202609270001_pronunciation_practice.sql`
- Create: `src/modules/pronunciation-practice/types.ts`
- Create: `src/modules/pronunciation-practice/scoring.ts`
- Create: `src/modules/pronunciation-practice/repository.ts`
- Test: `src/modules/pronunciation-practice/scoring.test.ts`
- Test: `src/modules/pronunciation-practice/repository.test.ts`
- Test: `src/modules/pronunciation-practice/migration.test.ts`
- Modify: `docs/architecture/database-and-storage.md`

**Interfaces:**

- Consumes: `PronunciationAnalysisResult`, `LearnerLevel`, `vocabulary_items`, General topics, and the private `speaking-answers` bucket.
- Produces: `createPronunciationSession`, `createWeakPronunciationSession`, `getClientPronunciationSession`, attempt register/start/complete/fail/retry helpers, score/summary helpers, and three service-role-only transactional RPCs.

- [x] Write failing tests for score boundaries, weakness rules, IPA availability, random unique selection, latest-success reads, weak retries, migration permissions, and registration idempotency.
- [x] Create owner-scoped session/item/attempt tables with immutable snapshots, lifecycle consistency constraints, indexes, RLS without client policies, and private upload metadata.
- [x] Implement atomic create/register/complete RPCs, including source-session weak-item validation and completion only after every item succeeds.
- [x] Implement the server-only repository and preserve deterministic latest-success ordering by `completed_at DESC, id DESC`.
- [x] Document the authoritative persistence, RPC, RLS, and Storage-path contract.
- [ ] Apply the migration to the intended Supabase project and exercise real Storage/provider calls in a separately authorized integration phase.

## Verification

```powershell
npm test -- --run src/modules/pronunciation-analysis src/modules/pronunciation-practice
npm run check
npm test
git diff --check
```

This plan is an execution record. Migrations and source code remain authoritative if they diverge.
