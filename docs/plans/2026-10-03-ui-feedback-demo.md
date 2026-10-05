# UI feedback demo polish

## Decisions

Implement the six requested feedback items with existing components and persistence. Pronunciation remains General-only and reuses stored Lingolix results. Profile displays the latest completed General session's qualitative vocabulary, grammar, fluency, and pronunciation feedback, with explicit empty/unavailable states. The existing learning-purpose text holds the learner's goal or desired score; no new scoring model or migration.

## Implementation

- Add logout with pending/error feedback using the existing server action. Update six navigation destinations and mobile layout; keep history accessible from dashboard/profile.
- Add persistent light/dark selection initialized before hydration, reuse CSS tokens, and polish contrast, focus, responsive layout, and reduced-motion behavior.
- Add a local SVG learning illustration and dashboard hero; remove the unavailable TOEIC card.
- Load an owner-filtered latest General assessment for profile skill cards. Keep Lingolix unavailable feedback honest and provide a pronunciation-practice link.
- Verify focused repository/result tests, TypeScript, full tests/build, and visual rendering where browser access is available. Update current architecture documentation.

## Acceptance

All six navigation labels fit responsive layouts. Logout reports errors and returns to sign-in. Theme persists across navigation/reload. Profile never fabricates scores or exposes another learner's result. General results keep audio-based pronunciation summary and practice words; IELTS remains unchanged. No new dependencies or database changes.
