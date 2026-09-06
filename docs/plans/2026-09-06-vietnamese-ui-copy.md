# Vietnamese UI Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace learner-facing English copy with concise, natural Vietnamese across Speakora without translating English questions or technical contracts.

**Architecture:** Edit copy at existing rendering and API response sites. Keep internal logs, enums, field names, database values, and English question content unchanged; update existing behavior tests where they assert user-visible messages.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest

## Global Constraints

- Preserve the current design system and application behavior.
- Keep IELTS, TOEIC, Speaking, and AI when clearer than translated alternatives.
- Do not add an i18n framework or copy abstraction.
- Preserve all current uncommitted work and user-owned Supabase files.

---

### Task 1: Auth, onboarding, navigation, and learner pages

**Files:** `src/app/auth/**`, `src/app/onboarding/**`, `src/app/(learn)/**`, `src/components/app-shell/**`, `src/components/dashboard/**`, `src/components/profile/**`, `src/components/topics/**`, and their existing tests.

- [x] Update existing rendering tests with literal Vietnamese outcomes for visible copy and run them to confirm they fail against English UI.
- [x] Translate visible copy directly in components and pages, preserving English database topic names.
- [x] Run the focused component tests and resolve text wrapping only where Vietnamese copy needs it.

### Task 2: Practice, processing, results, and user-visible API errors

**Files:** `src/components/practice/**`, `src/app/demo/speech/page.tsx`, `src/app/api/**`, and existing route/component tests.

- [x] Update tests for learner-visible statuses, actions, empty states, and API error values; run them to confirm expected copy failures.
- [x] Translate UI and API error values while leaving internal logs, request fields, enums, and English question content unchanged.
- [x] Run focused practice and route tests.

### Task 3: Audit and verification

**Files:** All changed source and test files.

- [x] Scan source for remaining learner-facing English and classify intentional technical/question strings.
- [x] Run `npm test`, `npm run check`, `npm run build`, and `git diff --check`.
- [x] Record any intentionally retained English and summarize the completed areas.
