# Vocabulary hub: topic-first flow

Approved 2026-10-27. This replaces the three-door vocabulary hub (Học từ mới / Ôn nhanh / Phát âm từ, each with its own topic, level and count form) with a topic-first flow. Frontend and server reads only: no migrations, no API contract changes, no worker changes.

## Problem

- The three doors overlap. Vocabulary Learning V2 already contains Learn, Pronounce and Recall. Flashcards and word pronunciation are subsets of it, so learners cannot tell which door to use.
- Every door asks for topic, level and word count again. Each topic has words at exactly one level, because the import maps a word's level from its topic. As a result the level step never offers a real choice.
- The per-word V2 state (NEW, LEARNING, WEAK, MASTERED) is computed but only appears on the Summary screen.
- The flow stutters:
  - Mode tabs are server round trips that show a skeleton shaped like the old form.
  - Starting a session waits on the create POST and then on a second server render. The V2 session route has a text-only loading state.
  - Each Learn step waits for `/advance` before showing a word whose data is already on the client.
  - The three session routes each use a different header and a different back link.

## Design

### `/vocabulary` (hub)

- A resume banner appears when a V2 session is unfinished.
- Level filter chips (Tất cả, plus the levels that have topics) filter on the client, with no navigation.
- Topic cards are sorted in this order: in-progress V2 topic, then topics with weak words, then topics matching the profile level, then by name. Each card shows:
  - the level label;
  - a mastered/total progress bar;
  - one status line: "N từ cần ôn", "N từ mới", or "Đã thuộc hết".
- The old `?mode=` and `?topic=` URLs redirect. A URL with a topic goes to that topic page, and a URL without one goes to the plain hub. `/vocabulary-learning` and `/pronunciation` now redirect straight to `/vocabulary`, and Next.js forwards `?topic=`.

### `/vocabulary/topics/[slug]` (topic page)

`topics` is a static segment, so it wins over `/vocabulary/[sessionId]`. Existing session URLs are unchanged.

- The header shows the topic name, level label, and the mastered, weak and new counts.
- There is one primary action, chosen by state:
  - an in-progress V2 session for this topic: "Tiếp tục phiên đang học";
  - any non-mastered word: "Học N từ tiếp theo" (N is at most 6), with a line that counts the words due for review and the new words;
  - everything mastered: "Ôn lại cả chủ đề" (the existing `selection: "MASTERED"`).
- Secondary links "Lật thẻ nhanh" and "Chỉ luyện phát âm" create a flashcard or pronunciation session immediately with min(10, available) words. A note explains that self-graded cards can only flag weak words and never mark a word as mastered.
- A word list shows each word, its IPA, its meaning and its state badge.
- Level: use the profile level when the topic has words at that level, otherwise the level with the most words.

### Smoothness

- The hub and topic page each read data once. Per-word state comes from a single `get_vocabulary_learning_history` call for all items involved.
- Skeletons match the final layout for the hub, the topic page and a shared session frame used by all three session routes.
- Start buttons react immediately (pending state) and then navigate into the matching session skeleton.
- V2 Learn advances optimistically. Saves are queued in order. On failure the view returns to the last confirmed server state and shows a retry message.
- After the learner plays a word's audio, the audio for the next word is fetched in advance.
- Word changes animate in under 200ms. Animation is disabled under `prefers-reduced-motion`.
- Session back links and summary links point to the topic page.

## Follow-up fixes (2026-10-27)

- **Learn audio froze in dev.** `LearnWord` cleared its `alive` ref only in an effect cleanup. Strict Mode's simulated unmount left it false, so playback never started and the button stayed disabled. The effect now sets the ref in its body.
- **Stuck on the last Pronounce word.** Once every word had a result, the linked pronunciation session became COMPLETED. Re-recording then cleared the card's feedback, which hid the continue button. The new attempt was rejected and misreported as "registration uncertain", and resending repeated the error. The fixes:
  - the card keeps the continue button once the word has any result;
  - V2 disables recording when the pronunciation session is COMPLETED;
  - the attempts route returns 409 and removes the upload.
- **Per-word skip.** Pronounce offers "Bỏ qua từ này" for a word without a result. This needs migration `202610270001_vocabulary_learning_skip_pronunciation.sql`.

## Files

- `src/modules/vocabulary-learning/topic-progress.ts`: pure aggregation (counts per topic, level choice, primary action, ordering) with tests.
- `src/modules/vocabulary-learning/repository.ts`: `listVocabularyTopicProgress(userId)` and `getLearningResumeForTopic(userId, topicId)`.
- `src/app/(learn)/vocabulary/page.tsx`, `src/components/vocabulary-hub/*`: new hub and redirects.
- `src/app/(learn)/vocabulary/topics/[slug]/{page,loading}.tsx`, `src/components/vocabulary-hub/topic-*.tsx`: topic page.
- `src/components/loading/learn-skeletons.tsx`: hub, topic and session-frame skeletons.
- `src/components/vocabulary-learning/learning-session.tsx`, `learn-word.tsx`: optimistic Learn and audio prefetch.
- Links in dashboard, profile, speaking topic page, session pages and summaries.
- Remove setup components that are no longer reachable: `VocabularyStart`, `LearningStart`, `PronunciationStart`, `PronunciationPreview`.

## Verification

- `npm test`, `npm run check`, `npm run build`.
- In the running app:
  - the hub and topic page load without layout shift;
  - start a V2 session from a topic and click through Learn quickly;
  - reload mid-session;
  - use both secondary actions;
  - old `?mode=` links redirect correctly.
