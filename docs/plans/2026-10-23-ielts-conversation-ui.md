# IELTS conversation UI redesign

## Scope and design

Implement the supplied examiner-first design in the existing Next.js practice
session. Keep all APIs, recording operations, ownership, retries, navigation,
question snapshots, and results intact. Scope presentation to IELTS only.

## Implementation

- [x] Add small presentation components for examiner, actual workflow state,
  and session context. Use the supplied local PNGs and Lucide controls.
- [x] Integrate with existing stage, recorder and TTS state. Preserve Part 2
  instructions and cue points, playback, review, re-record and explicit upload.
- [x] Add scoped responsive CSS with theme tokens, focus states and reduced
  motion. Display submitted progress separately from current question position.
- [x] Test state presentation, run the existing regression suite, typecheck and
  production build. Inspect browser layouts if browser access is available.

## Verification boundaries

No fake translation, notes, session duration, waveform or pronunciation data.
Live microphone, provider and private Storage verification requires an actual
browser session and configured external services.

## Results

- Full suite: 100 files, 447 tests passed. The first concurrent test/build run
  timed out in the unchanged Azure standalone import test; its isolated rerun
  and subsequent full-suite rerun passed.
- TypeScript check and production build passed.
- Nine focused presentation/integration rendering tests passed after the final
  audio-source cleanup. No separate lint script is configured.
- Independent review led to restricting the authenticated close fallback to
  IELTS and tightening assertions for the active workflow step.
- Browser inventory returned no browsers or native app surfaces. Responsive
  rules and assets were inspected, but desktop/mobile rendering, real microphone
  permissions, playback, upload retry and a live completed session remain manual
  verification steps. No external service flow was exercised.
