# Pronunciation Setup UI

## Goal and design

Refresh only the pronunciation setup screen using the existing purple theme tokens. Keep the current page title and server-side authentication/topic loading. Use a two-column setup/preview layout, stacked on mobile, topic radio chips, level radio cards, count presets and a compact custom input preserving every integer from 1–20. Retain the current defaults, availability validation, submission lock, API payload, navigation, error handling and reauthentication flow.

The example preview is explicitly illustrative (banana, British IPA, spelling syllables and stress), not an assessment or a fetched vocabulary item. Explicit listening uses browser speech synthesis with English language and an unsupported/error fallback; no new API, library, provider call or automatic playback. Decorative waveform bars are CSS only.

## Steps

1. Add focused rendering regression tests for radio selection/defaults, low availability, arbitrary counts, summary, empty state and illustrative preview.
2. Change setup markup and add the small preview component; preserve existing create-session logic and data fetching.
3. Add scoped setup-only styling, mobile stacking, token-based depth, hover/focus states and CSS transitions with reduced-motion support.
4. Run focused tests, typecheck and full regression tests; review the scoped diff. Browser checks depend on an attached browser. Keep existing dirty worktree changes and do not commit them.

No database/API changes, new session flow, animation library, evaluation preview scores or changes to pronunciation session/result screens.

## Verification

- Five focused rendering tests pass; `npm run check` passes.
- Full suite: 632 tests across 155 files pass (includes the existing local worktree tests).
- `npm run build` passes using an isolated output directory to preserve the running development server. Temporary build configuration changes were restored.
- Focused code review found no blocking issues. The preview requests a British browser voice to match the illustrative IPA.
- No browser was available for visual, keyboard or speech playback checks; native speech lifecycle and live provider behavior are not claimed as verified.
