# Current Architecture Overview

## System Shape

Speakora is currently a TypeScript modular monolith with two runtime processes:

```mermaid
flowchart LR
    B[Browser] --> N[Next.js application]
    N --> P[(Supabase PostgreSQL)]
    N --> S[Supabase Storage]
    N --> O[OpenAI TTS]
    W[TypeScript worker] --> P
    W --> S
    W --> O2[OpenAI STT and assessment]
```

- The Next.js 15 App Router application serves the UI and HTTP APIs.
- Supabase PostgreSQL stores the question bank, practice sessions, answers, transcripts, jobs, and assessments.
- The private `speaking-answers` Supabase Storage bucket stores recorded answers.
- A long-running Node.js worker claims durable jobs from PostgreSQL and performs STT and assessment.
- OpenAI calls are server-side and accessed through a shared provider abstraction.

There is no separate FastAPI service, Redis queue, or Python worker in the implemented repository.

## Entry Points

| Path | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Redirects unauthenticated visitors to sign-in and authenticated learners to onboarding or the dashboard. |
| `src/app/onboarding/page.tsx` | Requires an authenticated session and collects the initial learner profile and daily answer goal. |
| `src/app/(learn)/dashboard/page.tsx` | Shows authenticated daily progress, streak, XP, recommendations, and recent activity. |
| `src/app/(learn)/explore/page.tsx` | Lists available General English topics with URL-backed search and level filters. |
| `src/app/(learn)/history/` | Lists owned sessions and reuses the authorized result/audio experience for detail. |
| `src/app/(learn)/profile/page.tsx` | Edits validated learner settings and shows read-only progress totals. |
| `src/app/(learn)/vocabulary/` | Topic-based Vocabulary Practice flashcards (self-review, no typing/STT). |
| `src/app/demo/speech/page.tsx` | Client-side five-question practice state machine, recording, upload, polling, and results. |
| `src/app/api/practice/sessions/route.ts` | Creates an IELTS guest session and fixed question snapshot. |
| `src/app/api/practice/sessions/[sessionId]/` | Uploads answers, returns status/results, and retries failed jobs. |
| `src/app/api/vocabulary/sessions/` | Creates vocabulary sessions, loads items, saves Remembered/Not remembered, and word TTS. |
| `src/app/api/speech/tts/route.ts` | Authorizes a session question and returns generated question audio. |
| `src/app/api/questions/random/route.ts` | Legacy/demo random-question endpoint supporting IELTS, TOEIC, and General modes. |
| `src/app/api/demo/speech/route.ts` | Legacy synchronous TTS/STT demo endpoint. It is not used by the five-question background flow. |
| `src/worker/index.ts` | Polling worker for `STT` and `ASSESSMENT` jobs. |

## Module Boundaries

- `src/modules/practice/`: guest-token handling, shared DTOs, session authorization, and Supabase repositories.
- `src/modules/dashboard/`: bounded dashboard aggregation, opaque history pagination, and safe learner-facing DTOs.
- `src/modules/audio/`: upload size and MIME validation.
- `src/modules/ai-gateway/`: `TextToSpeechProvider`, `SpeechToTextProvider`, `AssessmentProvider`, and the OpenAI implementation.
- `src/lib/supabase/`: validates server environment and constructs public/admin Supabase clients plus request-scoped cookie-backed authentication clients.
- `supabase/migrations/`: creates the implemented schema, Storage bucket, RPC transactions, RLS, and job-claiming function.

Route handlers validate transport input and delegate shared operations to these modules. The worker reuses the AI gateway but creates its own service-role Supabase client because it runs outside Next.js.

## Runtime and Deployment

Run the web application and worker as separate long-running processes from the same repository:

```powershell
npm run dev
npm run worker
```

Production requires applying all SQL migrations, configuring server-only environment variables, deploying Next.js, and keeping at least one worker process alive. The browser requires localhost or HTTPS for microphone access.

## Current Scope

Implemented scope includes the guest IELTS flow plus cookie-backed learner authentication, onboarding, prepared-topic General English practice, mode-specific assessment, progress rewards, personalized recommendations, dashboard, history, and profile editing. TOEIC remains unavailable and appears only as a disabled "Coming soon" card; `/demo/speech` stays directly available for guest regression testing.
