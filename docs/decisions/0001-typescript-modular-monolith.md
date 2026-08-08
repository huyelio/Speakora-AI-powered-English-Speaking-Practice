# ADR 0001: TypeScript Modular Monolith with PostgreSQL Jobs

**Status:** Accepted
**Date:** 2026-08-07

## Context

Early project documents proposed a Next.js frontend, FastAPI backend, Python worker, and Redis with Celery or RQ. When the first complete IELTS MVP was implemented, the repository already consisted of a small Next.js/TypeScript application with Supabase question-bank access and OpenAI speech routes. Adding a second language runtime and queue service would have increased deployment and maintenance cost before the MVP needed independent service scaling.

## Decision

Use a TypeScript modular monolith with two processes from one codebase:

- Next.js App Router serves the UI and trusted HTTP route handlers.
- Shared TypeScript modules hold practice, audio, and AI gateway logic.
- A long-running Node.js worker performs STT and session assessment.
- Supabase PostgreSQL stores durable business/job state; an RPC using `FOR UPDATE SKIP LOCKED` claims jobs.
- Supabase Storage holds private answer audio.

## Consequences

Benefits:

- one language, dependency graph, and deployment artifact;
- reuse of DTOs and provider abstractions;
- durable retry state without an additional Redis service;
- straightforward evolution from the existing codebase.

Trade-offs:

- a continuously running worker is required;
- PostgreSQL polling is less specialized than a dedicated high-throughput queue;
- route and worker modules must maintain clear boundaries despite sharing a repository;
- service-role access requires strict server-only handling and explicit authorization.

## Reconsider When

Adopt a dedicated queue or split services only when measured load, independent scaling, operational isolation, language-specific processing libraries, or queue semantics justify the additional infrastructure. The earlier FastAPI/Redis design remains historical rationale, not current architecture.
