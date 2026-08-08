# Documentation Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize all repository documentation into an English, accurately classified, Codex-friendly hierarchy without changing product behavior.

**Architecture:** Add a concise root agent guide and a documentation index, then separate implemented architecture from stable target specifications, dated plans, and architecture decisions. Preserve useful information from the numbered documents while removing contradictory current-state claims; source and migrations remain authoritative.

**Tech Stack:** Markdown, Next.js 15, TypeScript, Supabase PostgreSQL/Storage, Vitest, PowerShell.

## Global Constraints

- Do not implement product features or perform unrelated refactors.
- All project documentation must be English.
- Preserve useful requirements, rationale, dataset provenance, and operational instructions.
- Current architecture statements must be verified from source code, SQL migrations, `package.json`, and `.env.example`.
- Only `scripts/export-supabase-schema.mjs` may change outside documentation, solely to update its generated documentation destination.
- Existing uncommitted product changes must remain untouched.

---

### Task 1: Agent Guide and Documentation Index

**Files:**
- Create: `AGENTS.md`
- Create: `docs/README.md`
- Create: `docs/plans/README.md`

**Interfaces:**
- Consumes: verified repository layout and commands from `package.json`.
- Produces: canonical discovery order and documentation taxonomy used by future sessions.

- [x] **Step 1: Write `AGENTS.md` with repository discovery, paths, commands, conventions, scope discipline, Superpowers guidance, and verification requirements.**
- [x] **Step 2: Write `docs/README.md` with links to every canonical document and authority rules.**
- [x] **Step 3: Write `docs/plans/README.md` explaining dated plan naming and non-authoritative status.**
- [x] **Step 4: Verify all referenced commands exist.**

Run:

```powershell
Get-Content package.json | Select-String '"dev"|"worker"|"test"|"check"|"build"|"questions:check"|"questions:import"|"db:schema"'
```

Expected: every command documented in `AGENTS.md` is present.

### Task 2: Current Architecture Documentation

**Files:**
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/practice-session-flow.md`
- Create: `docs/architecture/database-and-storage.md`
- Create: `docs/architecture/question-bank.md`
- Create: `docs/architecture/question-bank-schema-snapshot.md`
- Modify: `scripts/export-supabase-schema.mjs`

**Interfaces:**
- Consumes: `src/app`, `src/modules`, `src/worker`, `src/lib/supabase`, `supabase/migrations`, and question import scripts.
- Produces: current-state architecture authority and generated schema snapshot destination.

- [x] **Step 1: Document the implemented runtime components, entry points, ownership boundaries, and deployment processes.**
- [x] **Step 2: Document the five-question session lifecycle, guest authorization, upload, polling, job retry, STT, and assessment flow.**
- [x] **Step 3: Document implemented database tables, private Storage bucket, RPC transactions, RLS posture, and migration authority.**
- [x] **Step 4: Consolidate question-bank schema, CSV import, dataset composition, and provenance warnings.**
- [x] **Step 5: Move the generated schema snapshot and update `OUTPUT_FILE` to `docs/architecture/question-bank-schema-snapshot.md`.**
- [x] **Step 6: Verify current architecture does not describe FastAPI or Redis as implemented.**

Run:

```powershell
Select-String -Path docs/architecture/*.md -Pattern 'FastAPI|Redis|Celery|SQLAlchemy|Alembic'
```

Expected: no matches except explicit “not implemented” context where needed.

### Task 3: Stable Specifications and Architecture Decision

**Files:**
- Create: `docs/specs/product-overview.md`
- Create: `docs/specs/functional-requirements.md`
- Create: `docs/specs/target-processing-pipeline.md`
- Create: `docs/specs/target-data-model.md`
- Create: `docs/specs/question-data-policy.md`
- Create: `docs/decisions/0001-typescript-modular-monolith.md`

**Interfaces:**
- Consumes: useful product intent from numbered legacy documents and verified current implementation boundaries.
- Produces: English long-term specifications separated from implemented architecture, plus the durable MVP architecture decision.

- [x] **Step 1: Preserve product vision and clearly separate implemented IELTS guest MVP from future modes and account features.**
- [x] **Step 2: Preserve functional requirement identifiers and group them by implemented, planned, and out-of-scope status.**
- [x] **Step 3: Preserve the target pipeline’s reliability, traceability, quality, and future analysis requirements.**
- [x] **Step 4: Preserve the target relational model and distinguish it from migration-defined current tables.**
- [x] **Step 5: Preserve source licensing, provenance, review, and publication requirements for question data.**
- [x] **Step 6: Record the decision to use Next.js route handlers, a TypeScript worker, and PostgreSQL jobs instead of the earlier FastAPI/Redis proposal.**

### Task 4: Remove Superseded Numbered Layout and Repair Links

**Files:**
- Delete: `docs/01-project-overview.md` through `docs/09-ielts-speaking-dataset-report.md`
- Modify: `README.md`
- Modify: canonical docs created in Tasks 1–3 as link validation requires.

**Interfaces:**
- Consumes: replacement documents from Tasks 1–3.
- Produces: one canonical documentation hierarchy with no duplicate numbered sources.

- [x] **Step 1: Add the documentation index link to the root README.**
- [x] **Step 2: Delete numbered documents only after their useful content is represented in canonical destinations.**
- [x] **Step 3: Search for stale numbered paths and repair all references.**

Run:

```powershell
rg -n 'docs/(0[1-9]-|07-current)|\./0[1-9]-' README.md AGENTS.md docs scripts
```

Expected: no stale references.

### Task 5: Documentation and Repository Verification

**Files:**
- Modify: documentation files only if verification finds defects.

**Interfaces:**
- Consumes: final documentation tree.
- Produces: verified documentation handoff.

- [x] **Step 1: List the final tree and confirm every canonical Markdown link target exists.**
- [x] **Step 2: Scan for Vietnamese text, placeholders, stale architecture claims, and accidental secret values.**
- [x] **Step 3: Run documentation-independent project verification.**

Run:

```powershell
npm test
npm run check
npm run build
git diff --check
```

Expected: tests, typecheck, production build, and whitespace validation all pass.

- [x] **Step 4: Review `git diff --name-status` and confirm no product source files were changed by this documentation task.**
- [x] **Step 5: Report the final tree, keep/move/merge outcomes, verification evidence, and any pre-existing unrelated working-tree changes.**
