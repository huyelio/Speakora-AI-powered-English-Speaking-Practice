# Speakora Documentation

This directory separates implemented architecture from product intent and temporary implementation work.

## Reading Order

1. [Architecture overview](architecture/overview.md) — current runtime and repository map.
2. [Practice session flow](architecture/practice-session-flow.md) — the implemented five-question lifecycle.
3. [Database and Storage](architecture/database-and-storage.md) — current persistence, jobs, and security model.
4. The relevant stable specification or architecture decision listed below.

## Current Architecture

- [Overview](architecture/overview.md)
- [Practice session flow](architecture/practice-session-flow.md)
- [Database and Storage](architecture/database-and-storage.md)
- [Question bank](architecture/question-bank.md)
- [Generated question-bank schema snapshot](architecture/question-bank-schema-snapshot.md)

Architecture documents describe behavior verified from the current repository. Source code and SQL migrations take precedence if they drift.

## Stable Specifications

- [Product overview](specs/product-overview.md)
- [Functional requirements](specs/functional-requirements.md)
- [Target processing pipeline](specs/target-processing-pipeline.md)
- [Target data model](specs/target-data-model.md)
- [Question data policy](specs/question-data-policy.md)
- [Documentation reorganization design](specs/documentation-reorganization-design.md)
- [IELTS demo improvements design](specs/ielts-demo-improvements-design.md)

Specifications preserve long-term intent. They may include explicitly labeled capabilities that are not implemented yet.

## Plans and Decisions

- [Plans index](plans/README.md)
- [Documentation reorganization plan](plans/2026-08-08-documentation-reorganization.md)
- [IELTS demo improvements plan](plans/2026-08-08-ielts-demo-improvements.md)
- [ADR 0001: TypeScript modular monolith](decisions/0001-typescript-modular-monolith.md)

Plans are dated execution records, not architecture authority. Decisions explain durable choices and superseded alternatives.

## Documentation Rules

- Write project documentation in English.
- Link instead of duplicating detailed material.
- State whether a capability is implemented, planned, or historical.
- Update architecture docs with behavior changes and specifications with requirement changes.
- Keep generated snapshots clearly labeled with their generation time.
