# Auth and Design System Implementation Plan

**Goal:** Repair the Supabase email/password registration flow and establish a reusable Speakora visual foundation while redesigning the four Auth screens.

**Approach:** Keep the existing Next.js Server Action and `@supabase/ssr` architecture. Add session-aware registration behavior and accessible result states, then layer shared Auth components on semantic CSS tokens without adding a UI framework.

## Tasks

- [x] Add failing tests for immediate-session registration, confirmation-required registration, callback URL construction, and unconfirmed-email sign-in feedback.
- [x] Implement the discriminated Auth action result contract and update reauthentication consumers.
- [x] Add failing rendering tests for accessible error, pending, confirmation, password-toggle, and shared Auth-shell behavior.
- [x] Implement shared Auth shell/form primitives and apply them to sign-in, sign-up, forgot-password, and update-password.
- [x] Add semantic color, typography, spacing, radius, shadow, focus, responsive, and reduced-motion CSS tokens.
- [x] Disable Confirm Email in the development Supabase project and exercise immediate registration; retain and verify the confirmation-required code path.
- [ ] Run focused tests, full tests, typecheck, production build, and responsive browser QA.

## Verification record

- Focused and full Vitest suites, TypeScript check, and production build completed successfully.
- All four Auth routes compiled and returned HTTP 200 in the development server.
- Remote registration returned an immediate confirmed session; the disposable test account was deleted afterward.
- Visual responsive browser QA remains manual because no controllable browser session was available in this environment.

## Constraints

- Preserve guest IELTS, learner onboarding, safe return paths, and in-place reauthentication.
- Do not add database migrations or a UI framework.
- Do not expose Supabase or OpenAI secrets to client code.
- Preserve the user's untracked Supabase CLI files.
