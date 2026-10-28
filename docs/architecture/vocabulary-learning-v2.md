# Vocabulary Learning V2

Sessions run at `/vocabulary-learning/<id>` and start from the vocabulary topic page (`/vocabulary/topics/[slug]`), which reads per-word state through `listVocabularyTopicProgress` (one items query plus one `get_vocabulary_learning_history` call; see `topic-progress.ts`). There is no level or count form: the level follows the topic (the profile level when the topic has it), and a session takes up to six words. Apply `202610250001_vocabulary_learning_v2.sql` before deploying the application. This document describes code behavior; live Azure and Supabase verification is a separate deployment check.

## Flow and reuse

Choose one topic and level, then Learn → Pronounce → Recall → Context → Summary. A session contains at most six distinct ACTIVE vocabulary IDs with nonblank IPA, all from that topic/level. Selection orders WEAK → LEARNING → NEW, oldest practice first, with ID as a stable tie-breaker. While NEW words remain, a session reviews at most three WEAK/LEARNING words and fills the other places with NEW words. When too few NEW words are left, more review words fill the rest (`MAX_REVIEW_WITH_NEW` in `rules.ts`). Without this cap, review words would fill every session and new words would never appear until older ones were mastered. MASTERED items are excluded unless explicitly requested. Weak review creates another session restricted to currently weak items from an owned, completed source V2 session. The Summary offers one primary "Học tiếp" step. It is the topic's next action, read from `GET /api/vocabulary-learning/topics/:topicId/next`, the same rule the topic page uses. A secondary "Chỉ ôn N từ còn yếu" starts the weak-only review. The Summary also states the mastery rule: correct recall in two different sessions plus good pronunciation.

Learn uses vocabulary snapshot TTS. Pronounce embeds `PronunciationCard`, reusing existing upload, recorder, Azure processor, result rendering and retry APIs. Every item requires a completed pronunciation attempt or an explicit skip (`skip: true` on the Pronounce advance, read by the RPC as `p_answer = 'SKIP'`, migration `202610270001`). A weak result still permits continuation. A skipped word keeps UNASSESSED pronunciation evidence, so it cannot become MASTERED from that session. Once every item has a result, the linked pronunciation session is COMPLETED and refuses new attempts: the card locks the microphone but keeps the continue action, and the attempts route answers 409 instead of a resend request. Provider failures do not count as learning failures. The final result remains visible until Continue. Server stage/cursor preserves that feedback on reload; already completed attempts can be continued without recording again.

Recall checks the submitted English word against its snapshot using trimmed, case-insensitive exact equality. Context blanks all literal whole-word occurrences in an existing example, without inflection or AI generation. At most three usable prompts are selected: wrong Recall first, weak pronunciation second, then remaining session order. The list is frozen when Recall ends. If no example matches, the session finishes with an explanation. Context never overwrites Recall or grants additional mastery credit.

## Screen layout

The session uses the shared A5 session frame (`src/components/session-frame/session-frame.css`, plan `2026-10-28-a5-session-frame`). Inside the app shell it fills exactly one viewport and the page never scrolls. The top row holds the exit to the topic page, the step chips (on phones, only the current step) and "Từ x / n". The body scrolls on its own and has the word card plus a "Bộ từ" bead box. Bead labels never name the word, because during Recall the word is the answer. The bottom action bar is always visible. LearnWord, PronunciationCard (`actionsTarget`) and the Summary render their buttons into it through a portal; Recall submits through a `form` attribute.

## Persistence and authorization

No new tables. `vocabulary_sessions` gains a FLASHCARD/LEARNING_V2 discriminator, unique pronunciation link, creation request ID, stage/cursor and JSON metadata. V2 snapshots add initial learning evidence and context prompt. `vocabulary_reviews.result` stores typed Recall; nullable context fields store Context separately.

Service-role-only RPCs aggregate history, create both sessions in one transaction using the existing create RPCs, and mutate stages/answers. Creation locks per user and reconciles request IDs; mutations lock the owned session row. First answer wins, including after retries or lost responses. Session/item ownership and stage preconditions are enforced before writes. No browser-supplied correctness or score is trusted. V2 is only COMPLETED at Summary, independently of pronunciation completion.

HTTP routes under `/api/vocabulary-learning/sessions` authenticate users and validate inputs. GET loads server progress; POST creates; `/advance` acknowledges Learn/Pronounce items (the client shows the next Learn word immediately and queues these saves in order, rolling back to the last confirmed state on failure); `/answers` grades Recall/Context and advances atomically. Legacy flashcard pages redirect V2 IDs, and the legacy review writer rejects them. TTS remains shared. Old selection, scoring, self-review and pronunciation controllers are unchanged.

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
