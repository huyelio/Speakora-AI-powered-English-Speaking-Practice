# Implementation Plans

- [A5 session frame](2026-10-28-a5-session-frame.md): the V2 and speaking sessions fill one viewport with fixed status, an inner scroll area and a pinned action bar, aligned to the A5 template.
- [Shared TTS service and cache](2026-10-27-shared-tts-cache.md): one TTS endpoint, a private Storage cache for fixed bank audio, streamed uncached AI role-play speech, and timeouts with "Thử nghe lại".
- [Vocabulary topic hub](2026-10-27-vocabulary-topic-hub.md): replaces the three-door vocabulary hub with topic cards and a topic page whose single primary action depends on word state, and removes waiting from the session flow.
- [Learner UI redesign: A5](2026-10-26-redesign-a5.md) — approved light-only warm retro redesign with skill-based navigation, vocabulary and speaking hubs, and session-safe redirects; frontend only. Previews live in [../design-preview/](../design-preview/).
- [Vocabulary Learning V2](2026-10-25-vocabulary-learning-v2.md) — incremental Learn, Pronounce, Recall, Context and Summary mode reusing existing sessions and assessment.

- [Friendly Playful UI](2026-10-07-friendly-playful-ui.md) — applies the selected visual template to existing components while preserving practice and processing behavior.
- [Pronunciation Practice MVP](2026-09-27-pronunciation-practice-mvp.md) — provider-neutral word analysis plus authenticated session and attempt persistence; API/UI follow separately.
- [Vocabulary Practice](2026-09-13-vocabulary-practice.md) — topic-based flashcard vocabulary sessions plus SkyPedia offline import pipeline.
- [Topic-based practice sessions](2026-09-12-topic-based-practice-sessions.md) — makes General sessions topic-first with configurable question counts while preserving the guest IELTS demo.
- [Auth and design system](2026-09-06-auth-and-design-system.md) — fixes the Supabase Auth registration experience and establishes reusable UI foundations.
- [Vietnamese UI copy](2026-09-06-vietnamese-ui-copy.md) — standardizes concise Vietnamese copy across learner-facing screens and API feedback.

Store medium and large change plans here using `YYYY-MM-DD-short-name.md`.

Plans should record the goal, constraints, files, verification, and implementation sequence. They may be retained after completion for historical context, but they do not override current architecture documents, source code, migrations, or architecture decisions.
