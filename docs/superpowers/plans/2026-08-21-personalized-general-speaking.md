# Personalized General Speaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated General English topic-practice journey with durable AI feedback, daily question goals, streaks, XP, recommendations, and owned history while preserving guest IELTS behavior.

**Architecture:** Keep the Next.js 15 modular monolith, Supabase PostgreSQL/Storage, and TypeScript worker. Add cookie-backed Supabase Auth, learner-owned records protected by RLS, deterministic topic/progress/recommendation modules, and mode-specific assessment contracts. Reuse the existing durable answer/job pipeline and expose it through a shared practice experience.

**Tech Stack:** Node.js 20+, Next.js 15 App Router, React 19, strict TypeScript 5.8, Supabase Auth/PostgreSQL/Storage, `@supabase/ssr`, Vitest 3, OpenAI TTS/STT/Responses API.

## Global Constraints

- Keep all AI calls behind provider interfaces in `src/modules/ai-gateway/`.
- Keep HTTP handlers thin and reusable server logic in `src/modules/`.
- Add every database change as an ordered SQL migration; never edit a generated schema snapshot as a migration.
- Preserve guest-session authorization, answer idempotency, private audio, durable jobs, and retry behavior.
- Never expose `SECRET_KEY` or `OPENAI_API_KEY` through client code or a `NEXT_PUBLIC_` variable.
- General English results must not contain an IELTS band or pronunciation score.
- Daily progress is measured by successfully registered answers in the learner's IANA timezone.
- XP values are fixed at 10 per answer, 25 per completed assessment, 30 per first daily-goal achievement, and 20 per first General topic completion; level is `Math.floor(totalXp / 250) + 1`.
- Initial content is 15 topics with 12 original questions each; a topic/level is selectable only when it has at least five active questions.
- Do not implement Google OAuth, realtime conversation, leaderboards, functional TOEIC practice, pronunciation scoring, or content administration.
- Use TDD for every behavior change and run focused tests before each task commit.
- Update architecture/spec documentation whenever implemented behavior changes.

## File Map

### Database and configuration

- Create `supabase/migrations/202608210001_learning_profiles_progress.sql`: profiles, goals, progress, XP ledger, streaks, session ownership columns, RLS, and progress/reward functions.
- Create `supabase/migrations/202608210002_general_practice_sessions.sql`: General session creation RPC and question snapshot validation.
- Modify `package.json` and lockfile: add `@supabase/ssr`.
- Create `src/lib/supabase/auth-server.ts`: request-scoped cookie client and current-user lookup.
- Create `src/lib/supabase/auth-middleware.ts` and `middleware.ts`: refresh Auth cookies and protect application routes.

### Domain modules

- Create `src/modules/profile/types.ts`, `repository.ts`, and `validation.ts`: onboarding/profile contracts.
- Create `src/modules/progress/rules.ts` and `rules.test.ts`: pure local-date, streak, XP, and level rules.
- Create `src/modules/topics/types.ts`, `repository.ts`, and `availability.test.ts`: topic catalog DTOs and availability mapping.
- Create `src/modules/questions/general-selection.ts` and `.test.ts`: five-question selection with recent-history avoidance.
- Modify `src/modules/practice/auth.ts`, `repository.ts`, and `types.ts`: user-or-guest principals and mode-aware sessions/results.
- Create `src/modules/recommendations/rank.ts` and `.test.ts`: deterministic topic ranking and reason labels.
- Create `src/modules/assessment/general-schema.ts` and `.test.ts`; rename no existing IELTS exports unless all imports are updated in the same task.
- Modify `src/modules/ai-gateway/openai.ts`: mode-specific assessment method and JSON schema.
- Refactor `src/worker/index.ts` into `src/worker/processors.ts` plus the polling entry point so worker behavior is unit-testable.

### Content and APIs

- Create `raw_data/General English Topics.csv`: 180 reviewed original questions.
- Modify `scripts/import-questions-csv.mjs` and add `scripts/import-questions-csv.test.mjs`: validate minimum topic/level coverage and preserve provenance.
- Create `src/app/api/profile/route.ts`, `topics/route.ts`, `dashboard/route.ts`, and `history/route.ts`.
- Modify practice session, answer, status, result, retry, TTS, and audio routes to accept authenticated ownership while retaining guest bearer tokens.

### UI

- Create `src/app/auth/*`: sign-in, sign-up, forgot-password, callback, and update-password screens/actions.
- Create `src/app/onboarding/page.tsx` and supporting client form.
- Create `src/app/(learn)/layout.tsx`, `dashboard/page.tsx`, `explore/page.tsx`, `topics/[slug]/page.tsx`, `practice/[sessionId]/page.tsx`, `history/page.tsx`, `history/[sessionId]/page.tsx`, and `profile/page.tsx`.
- Create focused components under `src/components/app-shell/`, `src/components/dashboard/`, `src/components/topics/`, and `src/components/practice/`.
- Modify `src/app/page.tsx`, `layout.tsx`, and `globals.css`; keep `src/app/demo/speech/page.tsx` available until the shared authenticated flow passes regression checks.

### Documentation

- Modify `docs/README.md`, relevant `docs/architecture/*.md`, `docs/specs/functional-requirements.md`, and `docs/plans/README.md` after implementation behavior is verified.

---

### Task 1: Learning Profile, Progress, Streak, and XP Foundation

**Files:**
- Create: `src/modules/progress/rules.ts`
- Create: `src/modules/progress/rules.test.ts`
- Create: `supabase/migrations/202608210001_learning_profiles_progress.sql`
- Modify: `docs/specs/target-data-model.md`

**Interfaces:**
- Produces: `learnerLocalDate(now: Date, timezone: string): string`
- Produces: `nextStreak(current: StreakState, achievedDate: string): StreakState`
- Produces: `levelFromXp(totalXp: number): number`
- Produces SQL functions `record_answer_progress(p_answer_id uuid)` and `complete_session_rewards(p_session_id uuid)`.

- [ ] **Step 1: Write failing progress-rule tests**

```ts
import { describe, expect, it } from "vitest";
import { learnerLocalDate, levelFromXp, nextStreak } from "./rules";

describe("learnerLocalDate", () => {
  it("uses the learner timezone across a UTC date boundary", () => {
    expect(learnerLocalDate(new Date("2026-08-21T17:30:00Z"), "Asia/Ho_Chi_Minh"))
      .toBe("2026-08-22");
  });
  it("rejects invalid IANA zones", () => {
    expect(() => learnerLocalDate(new Date(), "GMT+7-ish")).toThrow("Invalid timezone");
  });
});

describe("nextStreak", () => {
  it("starts, increments, and does not double-increment a local date", () => {
    expect(nextStreak({ current: 0, longest: 0, lastAchievedDate: null }, "2026-08-20"))
      .toEqual({ current: 1, longest: 1, lastAchievedDate: "2026-08-20" });
    expect(nextStreak({ current: 1, longest: 1, lastAchievedDate: "2026-08-20" }, "2026-08-21").current).toBe(2);
    expect(nextStreak({ current: 2, longest: 2, lastAchievedDate: "2026-08-21" }, "2026-08-21").current).toBe(2);
  });
  it("restarts after a missed day", () => {
    expect(nextStreak({ current: 8, longest: 8, lastAchievedDate: "2026-08-18" }, "2026-08-21"))
      .toEqual({ current: 1, longest: 8, lastAchievedDate: "2026-08-21" });
  });
});

it("derives one level per 250 XP", () => {
  expect([levelFromXp(0), levelFromXp(249), levelFromXp(250), levelFromXp(500)])
    .toEqual([1, 1, 2, 3]);
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run: `npx vitest run src/modules/progress/rules.test.ts`

Expected: FAIL because `./rules` does not exist.

- [ ] **Step 3: Implement the pure progress rules**

```ts
export type StreakState = {
  current: number;
  longest: number;
  lastAchievedDate: string | null;
};

export function learnerLocalDate(now: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
  } catch {
    throw new Error("Invalid timezone.");
  }
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function nextStreak(state: StreakState, achievedDate: string): StreakState {
  if (state.lastAchievedDate === achievedDate) return state;
  const adjacent = state.lastAchievedDate !== null &&
    dayNumber(achievedDate) - dayNumber(state.lastAchievedDate) === 1;
  const current = adjacent ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastAchievedDate: achievedDate };
}

export const levelFromXp = (totalXp: number) => Math.floor(Math.max(0, totalXp) / 250) + 1;
```

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/modules/progress/rules.test.ts`

Expected: PASS with 0 failed tests.

- [ ] **Step 5: Add the identity/progress migration**

Create enums/check constraints for the three levels, then create:

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  level text not null check (level in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  learning_purpose text not null check (char_length(learning_purpose) between 1 and 160),
  timezone text not null,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.learning_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_answer_target integer not null check (daily_answer_target between 1 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.daily_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null, completed_answers integer not null default 0 check (completed_answers >= 0),
  goal_achieved_at timestamptz, primary key (user_id, local_date)
);
create table public.xp_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('ANSWER','SESSION','DAILY_GOAL','FIRST_TOPIC')),
  amount integer not null check (amount > 0), session_id uuid, answer_id uuid,
  idempotency_key text not null unique, created_at timestamptz not null default now()
);
create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0, longest_streak integer not null default 0,
  last_goal_achieved_date date, updated_at timestamptz not null default now()
);
```

Alter `practice_sessions` to add nullable `user_id`, `topic_id`, `difficulty_level`, and `session_kind`; make `guest_token_hash` nullable; widen the mode constraint to `IELTS|GENERAL`; add an ownership check requiring a user or guest token. Add foreign keys from `xp_events.session_id` and `answer_id` only after the referenced columns exist.

Enable RLS and add `auth.uid() = user_id` select/update policies for profiles/goals and read policies for progress/streak/XP. Do not allow clients to insert XP or progress. Implement `record_answer_progress` and `complete_session_rewards` as service-only `security definer` functions that derive the user/session/topic, create uniquely keyed XP events, increment a local-date row only on the first `ANSWER:{answer_id}` event, cross the goal once, and return authoritative totals.

- [ ] **Step 6: Apply the migration to a disposable/local Supabase database and inspect policies**

Run when local Supabase is configured: `supabase db reset`

Expected: both existing migrations and `202608210001_learning_profiles_progress.sql` apply without SQL errors. Query `pg_policies` and confirm learner tables have owner-scoped policies and no client insert policy for `xp_events` or `daily_progress`. If the Supabase CLI is unavailable, record this step as externally unverified; do not claim migration verification.

- [ ] **Step 7: Commit the foundation**

```powershell
git add src/modules/progress/rules.ts src/modules/progress/rules.test.ts supabase/migrations/202608210001_learning_profiles_progress.sql docs/specs/target-data-model.md
git commit -m "feat: add learner progress foundation"
```

### Task 2: Cookie-Backed Supabase Auth

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/supabase/auth-server.ts`
- Create: `src/lib/supabase/auth-middleware.ts`
- Create: `middleware.ts`
- Create: `src/modules/auth/actions.ts`
- Create: `src/modules/auth/redirect.test.ts`
- Create: `src/modules/auth/redirect.ts`
- Create: `src/app/auth/sign-in/page.tsx`
- Create: `src/app/auth/sign-up/page.tsx`
- Create: `src/app/auth/forgot-password/page.tsx`
- Create: `src/app/auth/update-password/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Interfaces:**
- Produces: `createAuthServerClient(): Promise<SupabaseClient>`
- Produces: `getRequestUser(): Promise<User | null>`
- Produces: server actions `signIn`, `signUp`, `signOut`, `requestPasswordReset`, and `updatePassword`.
- Produces: `safeReturnPath(value: FormDataEntryValue | null): string`.

- [ ] **Step 1: Add the SSR dependency**

Run: `npm install @supabase/ssr`

Expected: `package.json` and `package-lock.json` contain the same resolved `@supabase/ssr` version.

- [ ] **Step 2: Write redirect-safety tests**

```ts
import { expect, it } from "vitest";
import { safeReturnPath } from "./redirect";

it("accepts only local absolute paths", () => {
  expect(safeReturnPath("/dashboard?welcome=1")).toBe("/dashboard?welcome=1");
  expect(safeReturnPath("https://attacker.test")).toBe("/dashboard");
  expect(safeReturnPath("//attacker.test")).toBe("/dashboard");
  expect(safeReturnPath(null)).toBe("/dashboard");
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npx vitest run src/modules/auth/redirect.test.ts`

Expected: FAIL because `redirect.ts` does not exist.

- [ ] **Step 4: Implement safe redirects and request-scoped Auth clients**

```ts
export function safeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}
```

In `auth-server.ts`, call `createServerClient(url, publishableKey, { cookies: { getAll, setAll } })` using `await cookies()` from `next/headers`. Never cache this client globally. `getRequestUser` must call `supabase.auth.getUser()` and return `null` on missing/invalid sessions.

In `auth-middleware.ts`, create a request/response cookie bridge, call `auth.getUser()` to refresh tokens, and redirect unauthenticated requests under `/dashboard`, `/explore`, `/topics`, `/practice`, `/history`, `/profile`, and `/onboarding` to `/auth/sign-in?next=<encoded pathname>`. Redirect authenticated users with incomplete onboarding in Task 3, not here.

- [ ] **Step 5: Implement Auth actions and pages**

Actions validate email with a bounded string and password length of at least 8, call the matching Supabase Auth method, return safe Vietnamese form errors, and redirect only through `safeReturnPath`. The callback route exchanges `code` for a session and redirects to the safe `next` value. Password reset uses `${origin}/auth/callback?next=/auth/update-password`.

The pages render labeled, accessible forms and links between sign-in, sign-up, and password recovery. Do not log emails, passwords, tokens, or raw Supabase errors.

- [ ] **Step 6: Run focused and type checks**

Run: `npx vitest run src/modules/auth/redirect.test.ts`

Expected: PASS.

Run: `npm run check`

Expected: TypeScript exits 0.

- [ ] **Step 7: Commit Auth**

```powershell
git add package.json package-lock.json middleware.ts src/lib/supabase/auth-server.ts src/lib/supabase/auth-middleware.ts src/modules/auth src/app/auth
git commit -m "feat: add email password authentication"
```

### Task 3: Profile Onboarding and Authenticated App Shell

**Files:**
- Create: `src/modules/profile/types.ts`
- Create: `src/modules/profile/validation.ts`
- Create: `src/modules/profile/validation.test.ts`
- Create: `src/modules/profile/repository.ts`
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/onboarding/onboarding-form.tsx`
- Create: `src/app/(learn)/layout.tsx`
- Create: `src/components/app-shell/app-shell.tsx`
- Create: `src/components/app-shell/navigation.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `ProfileInput = { displayName: string; level: LearnerLevel; learningPurpose: string; timezone: string; dailyAnswerTarget: number }`.
- Produces: `parseProfileInput(value: unknown): ProfileInput`.
- Produces: `getProfile(userId: string)` and `upsertOnboarding(userId: string, input: ProfileInput)`.
- API: `GET /api/profile`, `PUT /api/profile`.

- [ ] **Step 1: Write profile validation tests**

```ts
import { expect, it } from "vitest";
import { parseProfileInput } from "./validation";

it("normalizes a valid onboarding payload", () => {
  expect(parseProfileInput({
    displayName: "  Lan  ", level: "INTERMEDIATE", learningPurpose: "Travel",
    timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 10,
  })).toEqual({ displayName: "Lan", level: "INTERMEDIATE", learningPurpose: "Travel",
    timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget: 10 });
});

it.each([0, 101, 2.5])("rejects daily target %s", (dailyAnswerTarget) => {
  expect(() => parseProfileInput({ displayName: "Lan", level: "BEGINNER",
    learningPurpose: "Work", timezone: "Asia/Ho_Chi_Minh", dailyAnswerTarget })).toThrow();
});
```

- [ ] **Step 2: Run the validation test and verify failure**

Run: `npx vitest run src/modules/profile/validation.test.ts`

Expected: FAIL because the validation module does not exist.

- [ ] **Step 3: Implement validation and repository transaction**

Validate name length 1–80, purpose length 1–160, enum level, integer target 1–100, and timezone by constructing `Intl.DateTimeFormat`. `upsertOnboarding` must write `profiles` and `learning_goals` atomically through a migration RPC named `upsert_learner_onboarding`; add that RPC to the Task 1 migration if Task 1 has not shipped, otherwise add a new forward-only migration.

- [ ] **Step 4: Implement profile API and onboarding gate**

Both API methods call `getRequestUser`; return 401 without a user. `PUT` parses input and calls the repository. The onboarding page redirects completed profiles to `/dashboard`. The `(learn)` layout redirects incomplete profiles to `/onboarding` and renders the shared responsive navigation.

The form has exactly three visible steps and submits only on the last step. Use browser `Intl.DateTimeFormat().resolvedOptions().timeZone` as the initial timezone, with `Asia/Ho_Chi_Minh` only as a display fallback when detection is empty.

- [ ] **Step 5: Redirect the root based on Auth state**

`src/app/page.tsx` checks `getRequestUser`: unauthenticated users go to `/auth/sign-in`; authenticated incomplete users go to `/onboarding`; complete users go to `/dashboard`. Keep `/demo/speech` directly reachable for guest regression testing.

- [ ] **Step 6: Verify**

Run: `npx vitest run src/modules/profile/validation.test.ts`

Expected: PASS.

Run: `npm run check`

Expected: exit 0.

- [ ] **Step 7: Commit onboarding and shell**

```powershell
git add src/modules/profile src/app/api/profile src/app/onboarding 'src/app/(learn)' src/components/app-shell src/app/page.tsx src/app/globals.css supabase/migrations
git commit -m "feat: add learner onboarding and app shell"
```

### Task 4: General English Content Catalog

**Files:**
- Create: `raw_data/General English Topics.csv`
- Create: `scripts/import-questions-csv.test.mjs`
- Modify: `scripts/import-questions-csv.mjs`
- Modify: `docs/architecture/question-bank.md`

**Interfaces:**
- Produces CSV columns: `code,mode,type,topic,topic_name,prompt,difficulty,status,instruction,prep_seconds,answer_seconds,replay_limit,source_name,license`.
- Produces exported testable functions `parseCsv`, `cleanRecord`, and `validateGeneralCoverage` without executing the CLI on import.

- [ ] **Step 1: Extract importer execution behind a main guard and write failing coverage tests**

```ts
import { describe, expect, it } from "vitest";
import { validateGeneralCoverage } from "./import-questions-csv.mjs";

describe("validateGeneralCoverage", () => {
  it("accepts five active questions for an offered topic and level", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      mode: "GENERAL", topic: "travel", difficulty: "BEGINNER", status: "ACTIVE",
      code: `GENERAL_TRAVEL_B_${index}`,
    }));
    expect(validateGeneralCoverage(rows)).toEqual([{ topic: "travel", difficulty: "BEGINNER", count: 5 }]);
  });
  it("rejects an active topic-level set with fewer than five rows", () => {
    expect(() => validateGeneralCoverage([{ mode: "GENERAL", topic: "travel",
      difficulty: "BEGINNER", status: "ACTIVE", code: "GENERAL_TRAVEL_B_1" }]))
      .toThrow("travel/BEGINNER has 1 active question; minimum is 5");
  });
});
```

- [ ] **Step 2: Run the focused importer test and verify failure**

Run: `npx vitest run scripts/import-questions-csv.test.mjs`

Expected: FAIL because the importer does not export `validateGeneralCoverage`.

- [ ] **Step 3: Implement coverage validation**

Export `parseCsv`, `cleanRecord`, and `validateGeneralCoverage`. Group active General rows by `${topic}/${difficulty}`, reject counts 1–4, and return sorted `{ topic, difficulty, count }` summaries for valid groups. Call this validation from the dry-run/import path after record cleaning. Wrap current CLI execution in `if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))` after importing `fileURLToPath` from `node:url`, so Vitest can import the functions without running the importer. Preserve current IELTS behavior.

- [ ] **Step 4: Add 180 original questions**

Create exactly 12 questions for each approved topic. Distribute each topic as 5 `ACTIVE` Beginner, 5 `ACTIVE` Intermediate, and 2 `DRAFT` Advanced questions. Advanced remains unavailable until a later content expansion reaches five reviewed active questions. Set `source_name=speakora-original` and `license=ORIGINAL` on every row.

Use stable codes such as `GENERAL_TRAVEL_B_001`, `GENERAL_TRAVEL_I_001`, and `GENERAL_TRAVEL_A_001`. Use `GENERAL_OPEN_TOPIC` for reflective prompts and `GENERAL_SITUATIONAL` for concrete response situations; do not use `GENERAL_ROLE_PLAY` because dynamic dialogue is deferred.

- [ ] **Step 5: Run importer and content checks**

Run: `npx vitest run scripts/import-questions-csv.test.mjs`

Expected: PASS.

Run: `npm run questions:check`

Expected: 302 total valid rows if the existing IELTS file remains at 122 rows, including `GENERAL=180`, with no duplicates or coverage errors. If the IELTS source count has changed, assert `GENERAL=180` rather than a hard-coded total.

- [ ] **Step 6: Commit content**

```powershell
git add 'raw_data/General English Topics.csv' scripts/import-questions-csv.mjs scripts/import-questions-csv.test.mjs docs/architecture/question-bank.md
git commit -m "feat: add general english topic catalog"
```

### Task 5: Topic Availability and Question Selection

**Files:**
- Create: `src/modules/topics/types.ts`
- Create: `src/modules/topics/availability.ts`
- Create: `src/modules/topics/availability.test.ts`
- Create: `src/modules/topics/repository.ts`
- Create: `src/modules/questions/general-selection.ts`
- Create: `src/modules/questions/general-selection.test.ts`
- Create: `src/app/api/topics/route.ts`
- Create: `supabase/migrations/202608210002_general_practice_sessions.sql`

**Interfaces:**
- Produces: `TopicSummary = { id: string; slug: string; name: string; levels: Array<{ level: LearnerLevel; count: number }>; practicedCount: number; lastPracticedAt: string | null }`.
- Produces: `selectGeneralQuestions(candidates: GeneralCandidate[], recentQuestionIds: readonly string[], count?: number): GeneralCandidate[]`.
- API: `GET /api/topics?search=&level=` returns only active topic/level combinations with at least five questions.
- SQL: `create_general_practice_session(p_user_id uuid, p_topic_id uuid, p_difficulty text, p_question_ids uuid[])`.

- [ ] **Step 1: Write selection tests**

```ts
import { expect, it } from "vitest";
import { selectGeneralQuestions } from "./general-selection";

const candidates = Array.from({ length: 7 }, (_, index) => ({
  id: `q${index + 1}`, code: `Q${index + 1}`, topicId: "travel", difficulty: "BEGINNER" as const,
  lastAnsweredAt: index < 2 ? `2026-08-${10 + index}T00:00:00Z` : null,
}));

it("selects five unique unseen questions first", () => {
  expect(selectGeneralQuestions(candidates, ["q1", "q2"]).map((item) => item.id))
    .toEqual(["q3", "q4", "q5", "q6", "q7"]);
});

it("falls back to least recently answered questions", () => {
  expect(selectGeneralQuestions(candidates.slice(0, 6), ["q1", "q2"]).map((item) => item.id))
    .toEqual(["q3", "q4", "q5", "q6", "q1"]);
});

it("fails when fewer than five eligible candidates exist", () => {
  expect(() => selectGeneralQuestions(candidates.slice(0, 4), [])).toThrow("Not enough active questions");
});
```

- [ ] **Step 2: Run selection tests and verify failure**

Run: `npx vitest run src/modules/questions/general-selection.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic selection and availability mapping**

Filter candidates to one topic/level before calling the selector. Preserve repository ordering for unseen questions, then append previously answered candidates sorted by `lastAnsweredAt` ascending and stable code. Remove duplicate IDs and slice exactly five.

Availability maps aggregate DB rows, discards counts below five, merges learner history, applies case-insensitive search in memory only after the database restricts results to active General content, and sorts by topic name.

- [ ] **Step 4: Implement topic repository and API**

Use the admin client only after `getRequestUser` authenticates the caller. Query active `GENERAL` questions grouped by topic/difficulty and the caller's completed session history. Return 401 without Auth and validate `level` against the three enum values.

- [ ] **Step 5: Add the atomic General session RPC**

The SQL function validates user existence, active General mode, active topic, supported difficulty, exactly five unique IDs, and every selected question's topic/mode/difficulty/status. It creates an owned `practice_sessions` row and five immutable `session_questions` snapshots atomically, then returns the same row shape as `create_ielts_practice_session`. Revoke execution from `public`, `anon`, and `authenticated`; grant only `service_role`.

- [ ] **Step 6: Run focused tests and migration check**

Run: `npx vitest run src/modules/topics src/modules/questions/general-selection.test.ts`

Expected: PASS.

Run when local Supabase exists: `supabase db reset`

Expected: the RPC migration applies and rejects a mixed-topic five-ID call without inserting a session.

- [ ] **Step 7: Commit selection/catalog backend**

```powershell
git add src/modules/topics src/modules/questions/general-selection.ts src/modules/questions/general-selection.test.ts src/app/api/topics supabase/migrations/202608210002_general_practice_sessions.sql
git commit -m "feat: add general topic selection backend"
```

### Task 6: Authenticated General Practice Backend

**Files:**
- Modify: `src/modules/practice/auth.ts`
- Modify: `src/modules/practice/auth.test.ts`
- Modify: `src/modules/practice/repository.ts`
- Modify: `src/modules/practice/types.ts`
- Modify: `src/modules/practice/audio-access.ts`
- Modify: `src/modules/practice/audio-access.test.ts`
- Modify: `src/app/api/practice/sessions/route.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/answers/route.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/status/route.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/result/route.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/retry/route.ts`
- Modify: `src/app/api/practice/sessions/[sessionId]/answers/[answerId]/audio/route.ts`
- Modify: `src/app/api/speech/tts/route.ts`

**Interfaces:**
- Produces: `SessionPrincipal = { kind: "user"; userId: string } | { kind: "guest"; token: string }`.
- Produces: `resolveSessionPrincipal(request: Request): Promise<SessionPrincipal | null>`.
- Produces: `authorizeSession(sessionId: string, principal: SessionPrincipal): Promise<AuthorizedSession | null>`.
- Produces: `createGeneralPracticeSession(userId: string, topicId: string, difficulty: LearnerLevel)`.
- Extends `POST /api/practice/sessions` to accept `{ mode: "GENERAL", topicId, difficulty, questionCount: 5 }` for authenticated callers.

- [ ] **Step 1: Write principal authorization tests**

```ts
import { expect, it, vi } from "vitest";
import { authorizeSessionRecord } from "./auth";

it("authorizes the matching user owner", () => {
  expect(authorizeSessionRecord({ user_id: "u1", guest_token_hash: null }, { kind: "user", userId: "u1" })).toBe(true);
  expect(authorizeSessionRecord({ user_id: "u1", guest_token_hash: null }, { kind: "user", userId: "u2" })).toBe(false);
});

it("preserves hashed guest authorization", () => {
  const credentials = createGuestCredentials();
  expect(authorizeSessionRecord({ user_id: null, guest_token_hash: credentials.hash }, { kind: "guest", token: credentials.token })).toBe(true);
});
```

- [ ] **Step 2: Run auth/audio tests and verify failure**

Run: `npx vitest run src/modules/practice/auth.test.ts src/modules/practice/audio-access.test.ts`

Expected: FAIL because the discriminated principal APIs are absent.

- [ ] **Step 3: Implement dual ownership**

Make `tokenMatches` accept only a non-null expected hash and return false otherwise. `resolveSessionPrincipal` prefers a verified Supabase user; when absent, it reads the bearer guest token. `authorizeSessionRecord` compares user IDs for user principals and timing-safe hashes for guest principals.

Update repository methods and `resolveAuthorizedAudio` to consume `SessionPrincipal`. Never treat the existence of a cookie or a client-supplied user ID as authenticated identity.

- [ ] **Step 4: Implement General session creation**

For `GENERAL`, require an authenticated user, validate the body, query eligible candidates plus recent answer timestamps, call `selectGeneralQuestions`, then call `create_general_practice_session`. For `IELTS`, preserve the current guest-token response and 2/1/2 selector. Return a shared DTO with `mode`, optional topic, questions, and guest token only for guest sessions.

- [ ] **Step 5: Generalize answer/status/result/retry/TTS/audio routes**

Every route resolves one principal and passes it to the repository authorization check. The answer route keeps MIME/size/idempotency validation and invokes `record_answer_progress(answer_id)` only after `register_practice_answer` returns a newly created or existing answer; the SQL function's ledger key prevents double counting either result.

Result DTO becomes a discriminated union:

```ts
export type PracticeResult =
  | ({ mode: "IELTS" } & IeltsAssessment)
  | ({ mode: "GENERAL" } & GeneralAssessment);
```

- [ ] **Step 6: Run practice regressions and typecheck**

Run: `npx vitest run src/modules/practice src/modules/questions`

Expected: all guest and user ownership tests PASS.

Run: `npm run check`

Expected: exit 0.

- [ ] **Step 7: Commit practice backend**

```powershell
git add src/modules/practice src/app/api/practice src/app/api/speech/tts/route.ts
git commit -m "feat: support authenticated general practice sessions"
```

### Task 7: General Assessment, Worker Rewards, and Recommendations

**Files:**
- Create: `src/modules/assessment/general-schema.ts`
- Create: `src/modules/assessment/general-schema.test.ts`
- Modify: `src/modules/ai-gateway/openai.ts`
- Create: `src/modules/recommendations/rank.ts`
- Create: `src/modules/recommendations/rank.test.ts`
- Create: `src/worker/processors.ts`
- Create: `src/worker/processors.test.ts`
- Modify: `src/worker/index.ts`
- Create: `supabase/migrations/202608210003_general_assessments.sql`

**Interfaces:**
- Produces: `GeneralAssessmentOutput` without `estimated_band`.
- Changes provider interface to `assess(input: string, mode: "IELTS" | "GENERAL"): Promise<Record<string, unknown>>`.
- Produces: `rankTopicRecommendations(profile, topics, recentSessions, weaknessTags): Recommendation[]`.
- Produces: `createJobProcessors(deps): { runStt(job): Promise<void>; runAssessment(job): Promise<void> }`.

- [ ] **Step 1: Write failing General assessment tests**

```ts
import { expect, it } from "vitest";
import { parseGeneralAssessmentOutput } from "./general-schema";

const valid = {
  overall_feedback: "Bạn truyền đạt ý rõ ràng.",
  criteria: {
    fluency_coherence: { summary: "Mạch ý dễ theo dõi.", example: null },
    lexical_resource: { summary: "Từ vựng phù hợp.", example: null },
    grammatical_range_accuracy: { summary: "Câu đơn chính xác.", example: null },
  },
  strengths: ["Trả lời đúng trọng tâm"], improvements: ["Mở rộng lý do"],
  next_steps: ["Luyện chủ đề Work"], useful_phrase: "From my point of view, ...",
  recommendation_tags: ["WORK", "VOCABULARY"],
};

it("accepts the General contract", () => expect(parseGeneralAssessmentOutput(valid)).toEqual(valid));
it("rejects IELTS and pronunciation fields", () => {
  expect(() => parseGeneralAssessmentOutput({ ...valid, estimated_band: 6.5 })).toThrow("unexpected property");
  expect(() => parseGeneralAssessmentOutput({ ...valid, pronunciation: "good" })).toThrow("unexpected property");
});
```

- [ ] **Step 2: Run assessment tests and verify failure**

Run: `npx vitest run src/modules/assessment/general-schema.test.ts`

Expected: FAIL because the General schema module does not exist.

- [ ] **Step 3: Implement the schema and mode-specific provider request**

Use the same exact-key and transcript-evidence rules as IELTS, with `useful_phrase` limited to 160 characters and `recommendation_tags` limited to known tags. Export `generalAssessmentJsonSchema`. Select instructions/schema/name by mode inside `OpenAIProvider.assess`; IELTS keeps `ielts_speaking_assessment`, General uses `general_speaking_assessment` and explicitly forbids exam bands and pronunciation claims.

Add `202608210003_general_assessments.sql` to make `session_assessments.estimated_band` nullable and add a required `assessment_mode` constrained to `IELTS|GENERAL`, backfilled to `IELTS` before applying `not null`. Add a check requiring a band for IELTS and requiring `estimated_band is null` for General. The migration preserves existing IELTS rows and prevents a General result from silently acquiring a fake band.

- [ ] **Step 4: Write recommendation ranking tests**

Test these exact priorities: matching level; exclude most recent topic when another exists; unpracticed before practiced; matching one of the last two sessions' tags; stable slug tie-break. Assert returned reason codes are `LEVEL_MATCH`, `NEW_TOPIC`, `WEAKNESS_MATCH`, or `LEVEL_UP`, and map those codes to Vietnamese UI copy outside the ranker.

```ts
it("prefers an unpracticed level match over the most recent topic", () => {
  const results = rankTopicRecommendations(
    { level: "INTERMEDIATE" },
    [
      { slug: "travel", levels: ["INTERMEDIATE"], lastPracticedAt: "2026-08-21T10:00:00Z" },
      { slug: "work", levels: ["INTERMEDIATE"], lastPracticedAt: null },
    ],
    [{ topicSlug: "travel", completedAt: "2026-08-21T10:00:00Z" }],
    [],
  );
  expect(results[0]).toMatchObject({ topicSlug: "work", reason: "NEW_TOPIC" });
});

it("uses a stable slug tie-break", () => {
  const results = rankTopicRecommendations(
    { level: "BEGINNER" },
    [
      { slug: "shopping", levels: ["BEGINNER"], lastPracticedAt: null },
      { slug: "family-friends", levels: ["BEGINNER"], lastPracticedAt: null },
    ],
    [],
    [],
  );
  expect(results.map((item) => item.topicSlug)).toEqual(["family-friends", "shopping"]);
});
```

- [ ] **Step 5: Extract and test worker processors**

Inject database and provider dependencies. In `runAssessment`, fetch session mode, parse with the correct schema, store mode-neutral common fields plus the full structured payload in `raw_output`, mark the session complete, call `complete_session_rewards(session_id)`, and then mark the job succeeded. A repeated assessment job must upsert one assessment and the reward RPC must return zero new XP on repeat.

Add a worker test with fakes that asserts a General job calls `provider.assess(input, "GENERAL")`, never reads `estimated_band`, and calls rewards only after assessment persistence succeeds.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/modules/assessment src/modules/recommendations src/worker/processors.test.ts`

Expected: PASS.

Run: `npm run check`

Expected: exit 0.

- [ ] **Step 7: Commit assessment and worker**

```powershell
git add src/modules/assessment src/modules/ai-gateway/openai.ts src/modules/recommendations src/worker supabase/migrations/202608210003_general_assessments.sql
git commit -m "feat: assess general speaking and award progress"
```

### Task 8: Shared Practice and Result Experience

**Files:**
- Create: `src/components/practice/practice-session.tsx`
- Create: `src/components/practice/recorder.ts`
- Create: `src/components/practice/recorder.test.ts`
- Create: `src/components/practice/result-view.tsx`
- Create: `src/components/practice/reauthenticate-dialog.tsx`
- Create: `src/app/(learn)/practice/[sessionId]/page.tsx`
- Create: `src/app/(learn)/topics/[slug]/page.tsx`
- Modify: `src/app/demo/speech/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `PracticeSession` client component accepting `{ initialSession, principalKind: "user" | "guest" }`.
- Produces: recorder state machine `idle -> recording -> review -> uploading -> submitted`.
- Produces: `ResultView` that switches exhaustively on `PracticeResult.mode`.

- [ ] **Step 1: Write recorder state tests**

```ts
import { expect, it } from "vitest";
import { recorderTransition } from "./recorder";

it("requires review before upload", () => {
  expect(recorderTransition("recording", "STOP")).toBe("review");
  expect(recorderTransition("review", "RERECORD")).toBe("recording");
  expect(recorderTransition("review", "SUBMIT")).toBe("uploading");
});

it("rejects invalid transitions", () => {
  expect(() => recorderTransition("idle", "SUBMIT")).toThrow("Invalid recorder transition");
});
```

- [ ] **Step 2: Run the recorder test and verify failure**

Run: `npx vitest run src/components/practice/recorder.test.ts`

Expected: FAIL because `recorder.ts` does not exist.

- [ ] **Step 3: Implement the recorder state machine and shared component**

Move recording lifecycle out of the large demo page. On stop, create an object URL and show playback, duration, "Record again," and "Submit answer." Re-record revokes the previous URL/blob. Upload failure retains the blob and idempotency key. Submitted answers cannot be replaced.

Use cookies automatically for owned sessions and add bearer headers only for guest sessions. Keep TTS prefetch, autoplay fallback, polling, retry, refresh recovery, private audio fetch, and microphone error messaging.

On an owned-session 401 while a blob is pending, open `ReauthenticateDialog` in place instead of navigating. The dialog invokes the Task 2 `signIn` server action with email/password, refreshes the current route after success, and retries the same upload using the retained blob and idempotency key. Canceling warns that closing or refreshing the page discards the unsubmitted recording. Guest sessions never show this dialog.

- [ ] **Step 4: Implement topic detail and owned practice route**

The topic page fetches topic availability for the signed-in user, renders context/vocabulary/available levels, and creates a General session through the API before navigating to `/practice/{sessionId}`. The practice page authorizes the owned session server-side and passes only safe DTOs to the client.

- [ ] **Step 5: Implement exhaustive result UI**

IELTS renders estimated band and its existing disclosure. General renders feedback, useful phrase, criteria, reward summary, daily-goal/streak update, and next-topic action without band or pronunciation score. Both render authorized answers and transcript evidence.

- [ ] **Step 6: Keep guest IELTS regression path**

Replace duplicated internals in `/demo/speech` with the shared component only after its guest contract is supported. Confirm sessionStorage recovery and bearer audio access still work; do not redirect this route through authenticated middleware.

- [ ] **Step 7: Verify UI logic and build**

Run: `npx vitest run src/components/practice src/modules/practice`

Expected: PASS.

Run: `npm run check`

Expected: exit 0.

Run: `npm run build`

Expected: production build succeeds with all routes compiled.

- [ ] **Step 8: Commit practice UI**

```powershell
git add src/components/practice 'src/app/(learn)/practice' 'src/app/(learn)/topics' src/app/demo/speech/page.tsx src/app/globals.css
git commit -m "feat: add reusable topic practice experience"
```

### Task 9: Dashboard, Explore, History, and Profile

**Files:**
- Create: `src/modules/dashboard/repository.ts`
- Create: `src/modules/dashboard/types.ts`
- Create: `src/app/api/dashboard/route.ts`
- Create: `src/app/api/history/route.ts`
- Create: `src/app/(learn)/dashboard/page.tsx`
- Create: `src/app/(learn)/explore/page.tsx`
- Create: `src/app/(learn)/history/page.tsx`
- Create: `src/app/(learn)/history/[sessionId]/page.tsx`
- Create: `src/app/(learn)/profile/page.tsx`
- Create: `src/components/dashboard/daily-goal-card.tsx`
- Create: `src/components/dashboard/streak-card.tsx`
- Create: `src/components/dashboard/recommendation-list.tsx`
- Create: `src/components/topics/topic-grid.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `DashboardDto = { profile; today; streak; totalXp; level; recommendations; recentSessions }`.
- Produces: paginated `HistoryDto = { items: HistoryItem[]; nextCursor: string | null }` ordered by `(created_at, id)` descending.
- Consumes `levelFromXp`, topic availability, and recommendation ranker from prior tasks.

- [ ] **Step 1: Write dashboard mapping tests**

Create `src/modules/dashboard/repository.test.ts` with injected query results. Assert total XP sum maps to the correct level, a stale `last_goal_achieved_date` displays current streak 0 without mutating the database, today's progress uses the profile timezone, and recent sessions exclude abandoned empty sessions.

```ts
import { expect, it } from "vitest";
import { mapDashboard } from "./repository";

it("derives level and displays a missed streak as zero", () => {
  const dto = mapDashboard({
    now: new Date("2026-08-21T12:00:00Z"),
    profile: { displayName: "Lan", level: "INTERMEDIATE", timezone: "Asia/Ho_Chi_Minh" },
    goal: { dailyAnswerTarget: 10 },
    todayProgress: { completedAnswers: 5 },
    streak: { currentStreak: 7, longestStreak: 9, lastGoalAchievedDate: "2026-08-19" },
    xpEvents: [{ amount: 250 }], topics: [], recentSessions: [], weaknessTags: [],
  });
  expect(dto).toMatchObject({ today: { completed: 5, target: 10 }, streak: { current: 0, longest: 9 }, totalXp: 250, level: 2 });
});

it("removes abandoned sessions with no answers", () => {
  const dto = mapDashboard({
    now: new Date("2026-08-21T12:00:00Z"),
    profile: { displayName: "Lan", level: "BEGINNER", timezone: "Asia/Ho_Chi_Minh" },
    goal: { dailyAnswerTarget: 5 }, todayProgress: null, streak: null, xpEvents: [], topics: [], weaknessTags: [],
    recentSessions: [
      { id: "empty", status: "IN_PROGRESS", answerCount: 0 },
      { id: "active", status: "PROCESSING", answerCount: 5 },
    ],
  });
  expect(dto.recentSessions.map((item) => item.id)).toEqual(["active"]);
});
```

- [ ] **Step 2: Run dashboard tests and verify failure**

Run: `npx vitest run src/modules/dashboard/repository.test.ts`

Expected: FAIL because the dashboard repository does not exist.

- [ ] **Step 3: Implement dashboard and history repositories/APIs**

Authenticate before using the admin client. Build one DTO from bounded queries: profile/goal/streak, today's progress, XP sum, latest two assessments for recommendation tags, topic availability, and five recent sessions. History defaults to 20 rows and uses an opaque base64url cursor containing `{ createdAt, id }`; validate the decoded shape and never accept a user ID from the client.

- [ ] **Step 4: Build dashboard and explore screens**

Dashboard order on mobile: greeting, daily goal, primary practice action, streak/XP, recommendations, recent activity, IELTS/TOEIC mode cards. Explore supports URL-backed `search` and `level` filters, empty states, and cards showing available count and learner state. TOEIC is a disabled card with no active link.

- [ ] **Step 5: Build history detail and profile editing**

History detail uses the same authorized result/audio contract as practice result. Profile editing reuses `parseProfileInput`; changing target is prospective because no historical daily rows are updated. Display current/longest streak, XP, and level read-only.

- [ ] **Step 6: Verify focused behavior and production compilation**

Run: `npx vitest run src/modules/dashboard src/modules/recommendations src/modules/profile`

Expected: PASS.

Run: `npm run check`

Expected: exit 0.

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 7: Commit the learning dashboard**

```powershell
git add src/modules/dashboard src/app/api/dashboard src/app/api/history 'src/app/(learn)' src/components/dashboard src/components/topics src/app/globals.css
git commit -m "feat: add personalized learning dashboard"
```

### Task 10: End-to-End Verification and Documentation

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/architecture/practice-session-flow.md`
- Modify: `docs/architecture/database-and-storage.md`
- Modify: `docs/architecture/question-bank.md`
- Modify: `docs/specs/functional-requirements.md`
- Modify: `docs/plans/README.md`
- Modify: `.env.example` if present; otherwise document required server variables without creating a file that could be mistaken for real credentials.

**Interfaces:**
- Consumes all previous tasks.
- Produces an accurate implemented-state description and a recorded verification report in the commit message/body or delivery summary.

- [ ] **Step 1: Run all focused and full automated checks**

Run: `npm run questions:check`

Expected: General content count is exactly 180 and all CSV rows validate.

Run: `npm test`

Expected: all Vitest files pass with 0 failed tests.

Run: `npm run check`

Expected: TypeScript exits 0.

Run: `npm run build`

Expected: Next.js production build exits 0.

- [ ] **Step 2: Apply and inspect the real migration when credentials are available**

Apply migrations to the intended Supabase project through the project's normal migration workflow. Verify Auth email/password configuration and redirect URLs. With two test accounts, confirm RLS prevents cross-account profile, session, transcript, assessment, progress, XP, and audio access. Do not print tokens or credentials in command output.

Expected: account A receives 404/403 for every account B resource and cannot query B-owned rows through the public client.

- [ ] **Step 3: Exercise one live General flow**

Import `raw_data/General English Topics.csv`, run `npm run dev` and `npm run worker`, then complete: register → onboarding → choose topic/level → record five answers → wait for STT/assessment → view rewards → reopen history.

Expected: daily count increases exactly five, answer XP is 50, completion XP is 25, first-topic XP is 20, daily-goal XP appears only if the configured target is crossed, one assessment is stored, and private audio plays only for the owner.

- [ ] **Step 4: Exercise retry/idempotency and guest IELTS regression**

Repeat an answer registration with the same idempotency key and retry a completed reward call. Confirm neither daily count nor XP changes. Complete or recover a guest IELTS session at `/demo/speech`, including bearer-protected audio playback.

Expected: no duplicate progress/reward rows; IELTS still uses 2/1/2 questions and estimated-band results.

- [ ] **Step 5: Perform responsive and failure-state QA**

At desktop and mobile widths, check Auth, onboarding, dashboard, Explore, topic detail, recording review/re-record, processing, result, history, and profile. Deny microphone once, expire a session before upload, simulate a failed worker job, and verify the documented retry/error states.

Expected: no horizontal overflow, primary record/practice controls remain reachable, pending audio is retained in memory through reauthentication, and no UI displays optimistic XP/streak before server confirmation.

- [ ] **Step 6: Update documentation to implemented truth**

Document authenticated and guest runtime flows, new tables/RPCs/RLS, General selection, assessment boundary, content counts, progress rules, environment/Auth setup, and remaining deferred TOEIC/realtime/pronunciation scope. Mark any live step from Steps 2–5 that could not be exercised as unverified.

- [ ] **Step 7: Re-run documentation-sensitive checks and inspect the final diff**

Run: `npm run check`

Expected: exit 0.

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only intended implementation and documentation files are modified.

- [ ] **Step 8: Commit integration documentation**

```powershell
git add docs .env.example
git commit -m "docs: document personalized speaking flow"
```

If `.env.example` does not exist, omit it from `git add` rather than creating a credential-bearing file.

## Final Review Gate

After Task 10, invoke `verification-before-completion` and `requesting-code-review`. Resolve every correctness, security, or requirement finding, then rerun `npm test`, `npm run check`, and `npm run build` from fresh commands. Use `finishing-a-development-branch` only after all checks pass and the live-verification status is stated precisely.
