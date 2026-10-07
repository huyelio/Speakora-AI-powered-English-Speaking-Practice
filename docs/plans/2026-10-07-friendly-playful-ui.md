# Friendly Playful UI application plan

**Goal:** Apply the selected `concept-2-playful.html` visual direction to the existing Speakora application.

**Approach:** Keep the existing React components, state machines, actions and data contracts. Add one presentation stylesheet after the existing structural CSS; adjust only the speaking page's rendered composition and brand marks. Reuse all current recording, playback, review, processing, retry and result controls.

**Stack:** Existing Next.js App Router, React, CSS custom properties and lucide-react. No new dependencies.

## Constraints

- The selected template is the visual source; application data remains the content source.
- Preserve authentication, theme selection, all modes, accessibility, recording lifecycle, session recovery and processing behavior.
- Do not edit APIs, repositories, worker code, migrations or business logic.
- Preserve all nine standalone concepts and existing user changes.
- Implement directly in the user's workspace as requested; do not commit, publish or create a separate implementation branch.

## Visual mapping

- Cream page: `#fcf8f3`; foreground: `#343044`; muted text: `#6d6276`.
- Lavender studio: `#eee7f4`; purple interaction: `#645094`; peach feedback: `#f5d9c3`.
- Segoe UI/system sans typography, restrained heading tracking and 1.6 body line height.
- Content width approximately 1160px; 28px desktop column gaps, 24–34px surface padding, 20px mobile gutters.
- Main studio: 30px radius; secondary bubbles: asymmetric 17px corners; controls: 13–15px radius.
- Solid surfaces and buttons; remove gradients, blur, ambient glow and heavy shadows. Retain only the microphone's shallow pressed-depth treatment.
- Adapt the existing optional dark theme with warm purple/peach surfaces and readable contrast. Preserve theme preference handling.
- Speaking page: real prompt and mic in the lavender studio, existing avatar/state and submitted question context beside it; stack on mobile. Do not fabricate conversation responses.
- Results/processing/setup, vocabulary, pronunciation, profile, authentication and learner navigation inherit the same visual language without changing their data or actions.

## Implementation and review

- [x] Inspect the selected template, current components, CSS and relevant architecture.
- [x] Apply the shared visual language, including forms, navigation, feedback and dark theme.
- [x] Compose speaking stages with the existing controls and actual session context.
- [x] Update the stable design specification and link this plan from the plans index.
- [x] Review the diff for handler/state/API changes and request a focused code review.
- [x] Run `npm test`, `npm run check`, and `npm run build`.
- [x] Inspect desktop/mobile browser renders of public pages and isolated real-component fixtures for authenticated states; exercise speaking states with browser-only API fixtures where necessary.
- [x] Verify no horizontal overflow, retained controls, basic focus/contrast and reduced-motion support.

## Validation boundary

Local fixtures may be used only in verification, outside the production application. These checks do not establish a live Supabase/OpenAI/worker round trip. Report that limitation explicitly.

## Verification results

- `npm test`: 159 suites / 658 tests passed (the configured discovery also includes the existing pronunciation worktree).
- `npm run check -- --incremental false`: passed.
- `npm run build`: passed; final compilation completed without warnings.
- Browser renders checked at 360, 390, 820 and 1440px with no page-level horizontal overflow; navigation remains horizontally scrollable on mobile. Public authentication and IELTS pages were inspected in Next.js. Authenticated practice, General results, dashboard cards, pronunciation setup/preview and vocabulary setup used isolated real-component fixtures.
- Chrome fake microphone exercised record, stop, audio playback, rerecord, upload, processing and IELTS result transitions against browser-only API fixtures. No application fixtures or mock production data were added.
- Keyboard Tab focus shows the 3px outline; dark controls retain readable foreground/surface levels; reduced-motion emulation disables transitions.
- Independent review found a tablet result-grid override, which was corrected. Visual review also removed a legacy 640px practice-card width cap and refined feedback padding.
- Git diff review confirms changes are presentation/styles/docs only; existing standalone HTML concepts are untouched.
