# Profile English Skills Radar Implementation Plan

**Goal:** Replace the Profile English Skills matrix with an accessible four-axis radar chart that visualizes only persisted assessment data.

**Architecture:** Keep persistence and source-selection behavior unchanged. Add a small profile visualization module that maps CEFR and IELTS values onto a chart-only 0–100 geometry while retaining the original learner-facing value, then render a dependency-free SVG radar with explicit labels and an accessible textual summary.

**Tech Stack:** Next.js 15, React 19, strict TypeScript, SVG, CSS, Vitest.

## Global Constraints

- The radar has exactly Listening, Speaking, Reading, and Writing axes.
- Missing assessment data uses the chart center only for geometry and is always labelled `Not assessed`.
- Original CEFR or IELTS values remain visible; normalized values are never presented as learner scores.
- Existing loading and unavailable behavior remains intact.
- No chart dependency is added.

## Tasks

- [x] Add failing domain tests for CEFR/IELTS normalization and unassessed geometry.
- [x] Add failing component tests for the radar, original Speaking value, four explicit statuses, and unavailable state.
- [x] Implement the isolated visualization model and custom SVG radar.
- [x] Replace matrix CSS with responsive radar styles using existing theme tokens.
- [x] Update architecture documentation and run focused tests, TypeScript check, and production build.
