# Documentation Reorganization Design

**Date:** 2026-08-08
**Status:** Approved for implementation

## Purpose

Reorganize the repository documentation so humans and future Codex sessions can quickly distinguish the implemented system from long-term product specifications and temporary implementation plans. All project documentation will be written in English.

## Current Problem

The root `docs/` directory contains nine numbered documents with useful product, database, pipeline, question-bank, and dataset information. The numbering does not communicate whether a document describes the current implementation or a future target. In particular, the existing system architecture describes FastAPI, Python workers, Redis, SQLAlchemy, and Alembic, while the repository implements Next.js API routes, a TypeScript worker, Supabase clients, SQL migrations, and a PostgreSQL-backed job queue.

There is no root `AGENTS.md` or documentation index. The generated Supabase schema script also writes to a numbered path that will no longer be canonical after reorganization.

## Chosen Approach

Use a preserve-and-classify structure:

```text
AGENTS.md
docs/
├── README.md
├── architecture/
│   ├── overview.md
│   ├── practice-session-flow.md
│   ├── database-and-storage.md
│   ├── question-bank.md
│   └── question-bank-schema-snapshot.md
├── specs/
│   ├── product-overview.md
│   ├── functional-requirements.md
│   ├── target-processing-pipeline.md
│   ├── target-data-model.md
│   ├── question-data-policy.md
│   └── documentation-reorganization-design.md
├── plans/
│   ├── README.md
│   └── 2026-08-08-documentation-reorganization.md
└── decisions/
    └── 0001-typescript-modular-monolith.md
```

## Document Responsibilities

- `AGENTS.md` is a concise operational guide: discovery order, important paths, verified commands, conventions, documentation expectations, scope discipline, and verification requirements.
- `docs/README.md` is the canonical documentation map and explains the difference between current architecture, stable specifications, plans, and decisions.
- `docs/architecture/` describes only behavior verified from current source, migrations, configuration, and scripts.
- `docs/specs/` preserves stable product intent and future-state requirements. Unimplemented behavior is labeled as target state rather than current behavior.
- `docs/plans/` contains dated execution plans and a short retention policy. Completed plans remain useful historical context but are never architecture authority.
- `docs/decisions/` records durable architecture decisions, including the implemented TypeScript modular monolith and database-backed worker queue that supersede the earlier FastAPI/Redis proposal for the MVP.

## Existing Document Mapping

| Existing document | Destination and treatment |
| --- | --- |
| `01-project-overview.md` | Translate to `specs/product-overview.md`; separate implemented IELTS MVP from longer-term multi-mode vision. |
| `02-functional-requirements.md` | Translate to `specs/functional-requirements.md`; preserve requirement identifiers and label implementation status without changing requirements. |
| `03-main-pipeline.md` | Translate to `specs/target-processing-pipeline.md`; retain the broader target pipeline and point to the current runtime flow. |
| `04-system-architecture.md` | Replace as architecture authority; preserve applicable rationale in current architecture docs and ADR 0001. |
| `05-database-design.md` | Translate to `specs/target-data-model.md`; identify migrations as the source of truth for the implemented schema. |
| `06-question-data-and-supabase-guide.md` | Translate stable provenance rules to `specs/question-data-policy.md`; merge operational import guidance into `architecture/question-bank.md`. |
| `07-current-supabase-schema.md` | Fold verified schema guidance into `architecture/database-and-storage.md`; change the export script to generate a clearly labeled question-bank-only snapshot alongside that document. |
| `08-csv-question-import-tool.md` | Merge into `architecture/question-bank.md`. |
| `09-ielts-speaking-dataset-report.md` | Preserve as an English dataset section or linked architecture document if needed to keep the question-bank guide scannable. |

## Accuracy and Preservation Rules

- Source code and SQL migrations override documentation when they conflict.
- Existing useful rationale, requirements, identifiers, provenance warnings, and operational commands must be retained.
- FastAPI, Redis, Celery/RQ, SQLAlchemy, Alembic, authenticated history, pronunciation assessment, and multi-mode practice must not be described as implemented.
- Current architecture documentation must identify the browser UI, Next.js route handlers, shared TypeScript modules, TypeScript worker, Supabase PostgreSQL/Storage, PostgreSQL RPC job claiming, and OpenAI gateway.
- No product feature or unrelated refactor is part of this work.
- The only permitted non-documentation change is updating the schema-export script path and heading so generated documentation remains in the new hierarchy.

## Verification

- Confirm every documentation link resolves and the final tree matches the intended taxonomy.
- Search current architecture docs for stale claims that FastAPI or Redis is implemented.
- Confirm commands against `package.json`, paths against the repository, and environment names against `.env.example` without exposing secret values.
- Run `npm test`, `npm run check`, `npm run build`, and `git diff --check` before claiming completion.
