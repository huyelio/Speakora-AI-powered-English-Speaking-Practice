# CEFR labels

**Goal:** Learners see CEFR consistently across the app, without changing how content is selected.

**Constraints:**

- `LearnerLevel` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) still drives filtering, recommendations and sessions. Each General topic has about 5 questions per level and a level needs at least 5 to appear, so six selectable levels would empty the catalog.
- IELTS keeps its band scale.
- CEFR labels on content are estimates. They come from the level mapping or from an AI model, and are not verified against an official word list.

## Changes

- [x] `learnerLevelLabels` in `src/modules/profile/types.ts` replaces the repeated Cơ bản/Trung cấp/Nâng cao maps with A1–A2, B1–B2 and C1–C2. `cefrOptions` keeps its descriptive names for the level picker.
- [x] AI role-play replies use the learner's `profiles.current_level`. They fall back to the scenario difficulty when the level is unset or cannot be read. The assessment prompt is unchanged.
- [x] `vocabulary_items.cefr_level` is a nullable, display-only column. The topic page shows it as a badge. A follow-up migration removed the rule that tied it to `level`, because `level` comes from the topic and each topic holds both easy and hard words.
- [x] `npm run vocabulary:cefr` fills missing labels in batches. `--dry-run` calls the model but writes nothing.

## Rollout

1. Apply `202611010001_vocabulary_cefr_level.sql` before deploying this code: the vocabulary hub selects the new column.
2. Apply `202611010002_vocabulary_cefr_independent.sql`.
3. Run `node --env-file=.env scripts/vocabulary/import-vocabulary.mjs --input raw_data/vocabulary/ai-topic-words.jsonl` to add 160 AI-written B2–C2 demo words (10 per topic).
4. Run `node --env-file=.env scripts/vocabulary/label-cefr.mjs --dry-run`, then run it without `--dry-run` to label the remaining words.

Call `node` directly: in PowerShell, `npm run <script> -- --flag` drops the flag. A dropped `--input` imports the default file, and a dropped `--dry-run` writes for real.

## Known gaps

- General topics have only 2 `ADVANCED` questions in the source CSV, so the C1–C2 filter stays empty and C1/C2 learners get no topic recommendations until more questions are added.
- Questions have no per-item CEFR label. They render from session snapshots, so showing one needs a change to the session RPCs. Add it with the new `ADVANCED` questions.

## Verification

Run `npm test`, `npm run check` and `npm run build`. In the app, check the speaking hub, dashboard, topic page, scenario catalog and vocabulary topic page in both locales, and compare role-play replies for an A2 and a C1 account.
