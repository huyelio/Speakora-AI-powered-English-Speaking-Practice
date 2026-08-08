# IELTS Demo Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IELTS-like question selection, an honest Vietnamese result dashboard, and authorized review of five recorded answers.

**Architecture:** Keep the Next.js modular monolith, Supabase Storage, PostgreSQL job queue, and TypeScript worker. Add pure tested domain helpers, validate selected IDs transactionally in a replacement session RPC, extend qualitative structured assessment, and proxy private audio through an authorized route.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase PostgreSQL/Storage, OpenAI Responses API, Vitest.

## Global Constraints

- Preserve guest-token hashing/authorization, idempotent uploads, private Storage, background jobs, retry, and refresh recovery.
- Do not add accounts, history, realtime features, pronunciation scoring, adaptive behavior, other practice modes, Redis, or FastAPI.
- Never create numeric criterion scores from transcript-only evidence.
- Use test-first red/green cycles for new domain behavior.

---

### Task 1: IELTS Question Selector

**Files:**
- Create: `src/modules/questions/ielts-selection.ts`
- Test: `src/modules/questions/ielts-selection.test.ts`
- Modify: `src/modules/practice/repository.ts`
- Create: `supabase/migrations/202608080001_ielts_part_distribution.sql`

**Interfaces:**
- Produces `selectIeltsSessionQuestions(candidates, random): IeltsQuestionCandidate[]` ordered Part 1, Part 1, Part 2, Part 3, Part 3.
- Replaces the RPC input with `p_question_ids uuid[]`, validated and snapshotted in one transaction.

- [ ] Write failing distribution, uniqueness, relation-preference, and fallback tests.
- [ ] Run the focused test and confirm failures are caused by the missing selector.
- [ ] Implement the minimal selector and repository candidate query.
- [ ] Add the replacement transactional RPC with active/type/order/duplicate validation.
- [ ] Run the focused tests to green.

### Task 2: Assessment Contract

**Files:**
- Create: `src/modules/assessment/schema.ts`
- Test: `src/modules/assessment/schema.test.ts`
- Modify: `src/modules/ai-gateway/openai.ts`
- Modify: `src/worker/index.ts`
- Modify: `src/modules/practice/types.ts`
- Modify: `src/modules/practice/repository.ts`

**Interfaces:**
- Produces `assessmentJsonSchema` and `parseAssessmentOutput(value)` with qualitative criteria and no pronunciation score.

- [ ] Write failing tests for valid qualitative criteria, invalid band/shape, and rejection of pronunciation fields.
- [ ] Run the focused test and confirm expected red failures.
- [ ] Implement the shared schema/parser and use it in the provider and worker.
- [ ] Map criteria from `raw_output` while remaining compatible with old assessment rows.
- [ ] Run the focused tests to green.

### Task 3: Authorized Answer Review

**Files:**
- Create: `src/modules/practice/audio-access.ts`
- Test: `src/modules/practice/audio-access.test.ts`
- Modify: `src/modules/practice/types.ts`
- Modify: `src/modules/practice/repository.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/result/route.ts`
- Create: `src/app/api/practice/sessions/[sessionId]/answers/[answerId]/audio/route.ts`

**Interfaces:**
- Produces an ordered `ReviewAnswer[]` in the authorized result response.
- Produces a private audio GET route authorized by guest session ownership and answer membership.

- [ ] Write failing authorization tests for missing/wrong token, wrong-session answer, and authorized audio metadata.
- [ ] Run the focused test and confirm expected red failures.
- [ ] Implement the authorization helper, repository review query, result response, and streaming route.
- [ ] Run the focused tests to green.

### Task 4: Vietnamese Practice and Result UI

**Files:**
- Modify: `src/app/demo/speech/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes assessment criteria and ordered review answers from the result API.

- [ ] Add Part 1/2/3 Vietnamese section labels during practice.
- [ ] Render the Vietnamese band estimate and qualitative criteria dashboard.
- [ ] Render fixed unscored pronunciation messaging.
- [ ] Render all five English questions, authorized audio players, and original transcripts under “XEM LẠI CÂU TRẢ LỜI”.
- [ ] Preserve polling, upload retry, session restoration, and reset behavior.

### Task 5: Documentation and Verification

**Files:**
- Modify: `docs/architecture/practice-session-flow.md`
- Modify: `docs/architecture/database-and-storage.md`
- Modify: `docs/specs/functional-requirements.md`

- [ ] Document 2/1/2 selection, relationship fallback, qualitative criteria, and secure answer playback.
- [ ] Run `npm test` and confirm all tests pass.
- [ ] Run `npm run check` and confirm no TypeScript errors.
- [ ] Run `npm run build` and confirm the production build succeeds.
- [ ] Run `git diff --check` and review the final changed-file list for scope.
