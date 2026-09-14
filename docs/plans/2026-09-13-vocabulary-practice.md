# Vocabulary Practice Implementation Plan

> Dated execution record for the Vocabulary Practice MVP. Source code and SQL migrations remain authoritative.

**Goal:** Flashcard vocabulary practice by existing General topics, with offline SkyPedia→embedding import pipeline.

**Shipped surfaces**

- Migration: `supabase/migrations/202609130001_vocabulary_practice.sql`
- Module: `src/modules/vocabulary/`
- API: `/api/vocabulary/sessions`, `.../[sessionId]`, `.../reviews`, `.../tts`
- UI: `/vocabulary`, `/vocabulary/[sessionId]`, dashboard mode card, topic CTA
- Pipeline: `scripts/vocabulary/*` + `raw_data/vocabulary/`

**Commands**

```powershell
# Apply migration in your Supabase project, then:
npm run vocabulary:sample
npm run vocabulary:import -- --dry-run
npm run vocabulary:import

# Optional SkyPedia path (download dictionary_en_vi.db first):
npm run vocabulary:extract -- raw_data/vocabulary/skypedia/dictionary_en_vi.db
npm run vocabulary:map -- --limit 200
npm run vocabulary:import

npm test -- vocabulary
npm run check
```

Embeddings are offline-only (map step). Runtime app uses plain `topic_id` FKs.
