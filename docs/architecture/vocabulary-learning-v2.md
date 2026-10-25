# Vocabulary Learning V2

Implemented as an additive mode at `/vocabulary-learning`. Apply `202610250001_vocabulary_learning_v2.sql` before deploying the application. This document describes code behavior; live Azure and Supabase verification is a separate deployment check.

## Flow and reuse

Choose one topic and level, then Learn → Pronounce → Recall → Context → Summary. A session contains at most six distinct ACTIVE vocabulary IDs with nonblank IPA, all from that topic/level. Selection uses WEAK → LEARNING → NEW, oldest practice first, ID as stable tie-breaker. MASTERED items are excluded unless explicitly requested. Weak review creates another session restricted to currently weak items from an owned, completed source V2 session.

Learn uses vocabulary snapshot TTS. Pronounce embeds `PronunciationCard`, reusing existing upload, recorder, Azure processor, result rendering and retry APIs. Every item requires a completed pronunciation attempt; a weak result still permits continuation. Provider failures do not count as learning failures. The final result remains visible until Continue. Server stage/cursor preserves that feedback on reload; already completed attempts can be continued without recording again.

Recall checks the submitted English word against its snapshot using trimmed, case-insensitive exact equality. Context blanks all literal whole-word occurrences in an existing example, without inflection or AI generation. At most three usable prompts are selected: wrong Recall first, weak pronunciation second, then remaining session order. The list is frozen when Recall ends. If no example matches, the session finishes with an explanation. Context never overwrites Recall or grants additional mastery credit.

## Persistence and authorization

No new tables. `vocabulary_sessions` gains a FLASHCARD/LEARNING_V2 discriminator, unique pronunciation link, creation request ID, stage/cursor and JSON metadata. V2 snapshots add initial learning evidence and context prompt. `vocabulary_reviews.result` stores typed Recall; nullable context fields store Context separately.

Service-role-only RPCs aggregate history, create both sessions in one transaction using the existing create RPCs, and mutate stages/answers. Creation locks per user and reconciles request IDs; mutations lock the owned session row. First answer wins, including after retries or lost responses. Session/item ownership and stage preconditions are enforced before writes. No browser-supplied correctness or score is trusted. V2 is only COMPLETED at Summary, independently of pronunciation completion.

HTTP routes under `/api/vocabulary-learning/sessions` authenticate users and validate inputs. GET loads server progress; POST creates; `/advance` acknowledges Learn/Pronounce items; `/answers` grades Recall/Context and advances atomically. Legacy flashcard pages redirect V2 IDs, and the legacy review writer rejects them. TTS remains shared. Old selection, scoring, self-review and pronunciation controllers are unchanged.

## Derived state

- NEW: no review or completed pronunciation assessment.
- WEAK: latest Recall/self-review is NOT_REMEMBERED or latest completed pronunciation has overall accuracy below 80, a syllable below 70, missing or extra syllables.
- MASTERED: not WEAK, the two latest V2 typed Recalls from distinct sessions are correct, and latest completed pronunciation contains valid, nonweak assessment data.
- LEARNING: other history. Missing or invalid assessment data cannot grant mastery; failed/processing attempts do not replace completed evidence.

History is aggregated in SQL across legacy and V2 sessions. Legacy self-review contributes weakness but never typed Recall mastery. Summary compares initial snapshots with current history, displaying per-skill improvement and weakness. It therefore reflects current history when reopened, including later sessions.

## Verification

Run `npm test`, `npm run check`, and `npm run build`. Opt-in real PostgreSQL transaction tests use a disposable local Docker container with no published port:

```powershell
$env:V2_SQL_TEST='1'
npx vitest run src/modules/vocabulary-learning/sql.integration.test.ts
Remove-Item Env:V2_SQL_TEST
```

These tests use synthetic assessment results and do not exercise Azure, real audio or a deployed Supabase project. Before a live demo, apply the migration to the intended demo database and run one authenticated six-word session with TTS, real microphone assessment, refresh, Recall, Context, Summary and weak retry.
