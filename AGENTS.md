# Repository Guide

## Start Here

Before changing code, read [docs/README.md](docs/README.md), then the relevant file under `docs/architecture/`. For product intent or future-state behavior, consult `docs/specs/`. Treat source code and `supabase/migrations/` as authoritative when documentation disagrees.

## Important Paths

- `src/app/`: Next.js pages and route handlers. The active UI is `src/app/demo/speech/page.tsx`.
- `src/modules/`: shared practice, audio, and AI gateway logic.
- `src/worker/`: long-running TypeScript background worker for STT and assessment.
- `src/lib/supabase/`: server-only Supabase configuration and clients.
- `supabase/migrations/`: implemented database and Storage schema.
- `scripts/`: question import, seed, and schema snapshot tools.
- `raw_data/`: source CSV data; preserve provenance and licensing warnings.
- `docs/`: current architecture, stable specifications, plans, and decisions.

## Commands

```powershell
npm run dev              # Next.js development server
npm run worker           # background worker; reads .env
npm test                 # Vitest suite
npm run check            # TypeScript typecheck
npm run build            # production build
npm run questions:check  # dry-run CSV validation
npm run questions:import -- "raw_data/IELTS Test.csv"
npm run db:schema        # regenerate the Supabase schema snapshot
```

Use Node.js 20+. Never expose `SECRET_KEY` or `OPENAI_API_KEY` through client code or a `NEXT_PUBLIC_` variable.

## Working Conventions

- Use strict TypeScript and Next.js App Router patterns already present in the repository.
- Keep HTTP handlers thin; place reusable server logic in `src/modules/`.
- Keep AI calls behind provider interfaces in `src/modules/ai-gateway/`.
- Preserve guest-session authorization, idempotency, private audio storage, and durable background jobs.
- Use SQL migrations for database changes; do not treat generated schema snapshots as migrations.
- Prefer focused changes. Avoid unrelated refactors or new infrastructure unless the requirement justifies them.
- Preserve existing user changes in a dirty worktree.

## Planning and Verification

- Check relevant documentation before implementation and update it when behavior changes.
- For medium or large changes, create or update a dated plan under `docs/plans/` first.
- Use the relevant Superpowers skills in `.codex/skills/`; start creative changes with brainstorming, bugs with systematic debugging, and verify before completion.
- Add or update focused tests for behavior changes. Before claiming completion, run the relevant subset plus `npm run check`; run `npm test` and `npm run build` for broad changes.
- Do not claim a live Supabase/OpenAI flow was verified unless the migration, worker, credentials, and external calls were actually exercised.
