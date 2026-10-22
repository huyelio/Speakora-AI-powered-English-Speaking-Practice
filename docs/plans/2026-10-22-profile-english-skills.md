# Profile English Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an honest, responsive English Skills section to `/profile` for Listening, Speaking, Reading, and Writing, showing only persisted assessment results and `Not assessed` otherwise.

**Architecture:** A server-only profile module selects the learner's latest completed assessed Speaking session from the two implemented sources: Quick Speaking Check (CEFR) and IELTS Speaking (band). It maps that result into a scale-neutral four-skill view model. A presentational React component renders a direct-label 2×2 skill matrix; it does not normalize unlike scales or imply values for unassessed skills.

**Tech Stack:** Next.js 15 App Router, React 19 server components, strict TypeScript, Supabase, Vitest, semantic CSS.

## Global Constraints

- Do not invent scores for skills without persisted assessment data.
- Render the exact status `Not assessed` for skills with no assessment.
- Preserve existing user changes in the dirty worktree.
- Add no chart dependency and no database migration.
- Keep touch targets, contrast, dark theme tokens, and mobile layout consistent with the current Friendly Playful profile UI.

---

### Task 1: English skill data projection

**Files:**
- Create: `src/modules/profile/english-skills.ts`
- Create: `src/modules/profile/english-skills.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdminClient()` and `getAssessment(sessionId, mode, sessionKind)`.
- Produces: `getEnglishSkills(userId): Promise<EnglishSkill[]>`, where each item has `key`, `label`, and either an assessed `value`, `scale`, `source`, `assessedAt` or `status: "NOT_ASSESSED"`.

- [x] **Step 1: Write failing repository tests**

  Cover latest Quick Check → Speaking CEFR, latest IELTS → Speaking band, no session → four `NOT_ASSESSED` items, and query error → explicit failure. Assert that Listening, Reading, and Writing never receive inferred values.

- [x] **Step 2: Run the repository test and verify RED**

  Run: `npm test -- src/modules/profile/english-skills.test.ts`

  Expected: FAIL because `english-skills.ts` does not exist.

- [x] **Step 3: Implement the minimal projection**

  Query completed owner sessions ordered by `completed_at` with filter `mode.eq.IELTS,session_kind.eq.QUICK_CHECK`, load the validated assessment through the existing repository, and map only `quickCheck.estimatedCefr` or `estimatedBand`. Keep the four-item catalog in one typed array so future skill sources can replace individual empty entries without changing the component contract.

- [x] **Step 4: Run the repository test and verify GREEN**

  Run: `npm test -- src/modules/profile/english-skills.test.ts`

  Expected: PASS.

### Task 2: Responsive English Skills matrix

**Files:**
- Create: `src/components/profile/english-skills.tsx`
- Create: `src/components/profile/english-skills.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `skills: EnglishSkill[]`, `timezone?: string`, and `unavailable?: boolean`.
- Produces: an accessible section titled `English Skills`, four directly labeled cards, actual Speaking result metadata, and `Not assessed` empty states.

- [x] **Step 1: Write failing component tests**

  Assert all four labels, an actual CEFR/IELTS value with source and localized assessment date, exact `Not assessed` text for missing skills, and a distinct `Unavailable` state for a failed read.

- [x] **Step 2: Run the component test and verify RED**

  Run: `npm test -- src/components/profile/english-skills.test.tsx`

  Expected: FAIL because the component does not exist.

- [x] **Step 3: Implement the component and styles**

  Use Lucide icons, semantic headings, direct value badges, and a two-column grid that collapses to one column at the existing mobile breakpoint. Use existing color/surface tokens and avoid radar, numeric bars, tooltips, canvas, or color-only meaning.

- [x] **Step 4: Run the component test and verify GREEN**

  Run: `npm test -- src/components/profile/english-skills.test.tsx`

  Expected: PASS.

### Task 3: Profile integration and documentation

**Files:**
- Modify: `src/app/(learn)/profile/page.tsx`
- Modify: `docs/architecture/overview.md`

**Interfaces:**
- Consumes: `getEnglishSkills(user.id)` in the existing parallel profile load.
- Produces: the new section between profile totals and the existing detailed Speaking feedback, with a fail-soft UI state.

- [x] **Step 1: Integrate the repository and component**

  Add the English Skills read to `Promise.all`, catch it independently, and pass `unavailable` without treating a database failure as an unassessed learner.

- [x] **Step 2: Update current architecture documentation**

  Record that `/profile` shows latest real Speaking CEFR/band and honest unassessed states for the three skills without implemented assessment data.

- [x] **Step 3: Run focused verification**

  Run: `npm test -- src/modules/profile/english-skills.test.ts src/components/profile/english-skills.test.tsx src/modules/profile/skill-review.test.ts src/components/profile/skill-overview.test.tsx`

  Expected: PASS.

- [x] **Step 4: Run repository verification**

  Run: `npm run check`

  Run: `npm test`

  Run: `npm run build`

  Expected: all commands exit 0. The repository has no lint script, so TypeScript check is the applicable static verification.

  Execution note: `npm run check` and `npm run build` exited 0. The default `npm test` also collected the nested `.worktrees/pronunciation-practice-mvp` suite and one unrelated 5-second Azure runtime test timed out under that duplicated load; the same test passed alone in 392 ms. `npx vitest run --exclude=.worktrees/**` verified the current checkout with 100 files and 442 tests passing.

## Plan Self-Review

- Coverage: persisted data discovery, honest missing states, real Speaking values, extensibility, responsive UI, documentation, and verification are represented.
- Scope: no assessment flow, score normalization, schema migration, or unrelated profile refactor.
- Type consistency: `EnglishSkill[]` is the single boundary between server data and presentation.
- Placeholder scan: no implementation placeholders remain.
