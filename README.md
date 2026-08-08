# Speakora IELTS Speaking MVP

Next.js + Supabase MVP for a five-question IELTS Speaking practice session:

`fixed question set → automatic TTS → recording/upload → background STT → session assessment`

See the [documentation index](docs/README.md) for the current architecture, stable specifications, implementation plans, and decisions. Future coding agents should also read [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 20+
- Supabase project with the existing question bank
- OpenAI API key with access to the configured TTS, transcription and assessment models
- Two long-running processes: Next.js and the background worker

## Setup

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` for Next.js and configure the Supabase/OpenAI values.
3. Apply every SQL file in `supabase/migrations/` in filename order.
4. Start the web app with `npm run dev`.
5. In a second process, start the worker with `npm run worker` (it reads `.env`; keep the same secrets there).
6. Open `http://localhost:3000/demo/speech`.

Microphone access requires localhost or HTTPS. `SECRET_KEY` and `OPENAI_API_KEY` are server-only and must never use a `NEXT_PUBLIC_` prefix.

## Verify

```powershell
npm test
npm run check
npm run build
```
