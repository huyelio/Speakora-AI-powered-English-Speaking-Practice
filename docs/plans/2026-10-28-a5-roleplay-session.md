# A5 role-play session and turn latency

Date: 2026-10-28. Status: done.

The AI role-play screen (`/speaking/conversation?scenario=…` and `?session=…`) was listed as out of scope in [A5 session frame](2026-10-28-a5-session-frame.md) and still used its own card layout, the old orange mic button and flat chat bubbles. Learners also reported that a turn feels slow.

## Latency findings

Measured from the development machine: one Supabase round trip takes about 120–190 ms. A learner turn makes two HTTP requests (`transcribe`, then `reply`) and, before this change, about 15 sequential Supabase round trips on top of OpenAI STT and the reply model:

| Step | Round trips |
|---|---|
| `transcribe`: auth, claim, upload, advance AUDIO, download the file just uploaded, advance TRANSCRIPT, load (2 sequential queries) | 8 |
| `reply`: auth, claim, load (2), advance REPLY, load (2) | 7 |

The UI showed nothing in the log while the turn was processed: the learner's message appeared only after STT finished, and the AI reply only after the model returned.

## Changes

Server (no contract change):

- `conversationStore.load` runs the session and message queries in parallel. Ownership is still enforced: the messages are discarded when the owned session is not found.
- `transcribeTurn` transcribes the uploaded file directly when it has just been stored, instead of downloading it again. A retry after refresh still downloads the saved audio.

UI (markup and CSS only; recording, idempotent retry, TTS and goal logic are unchanged):

- The session uses the shared `.a5-session` frame: a top row with the exit button, the scenario label, goal dots and "Kết thúc"; a body that scrolls on its own; a pinned action bar with the deck (knob, Fraunces status, timer) and round hint and keyboard buttons.
- The speaking hub tabs are no longer shown above the session, matching `/practice/<id>`.
- Introduction: topic icon by category, title, level and duration chips, the situation in a teal bubble, the two roles and the goals, with "Bắt đầu hội thoại" in the action bar.
- Chat: AI turns are paper bubbles with a brown outline; the latest AI turn is the teal bubble in Fraunces; learner turns are mustard-soft bubbles. Goal ticks are olive chips.
- Feedback while waiting: the learner bubble appears as soon as the recording stops (the typed text, or "Đang nhận diện…"), and a typing bubble is shown while the AI replies.
- Side panel on wide screens: "Tình huống" and "Mục tiêu" (olive done, mustard current). Below 1024px the goals open from the count in the top row.
- Result: turn and goal tiles plus the goal list; "Luyện lại tình huống" and "Chọn tình huống khác" in the action bar.
- Scenarios gain an optional Vietnamese `aiName` (for example "Hành khách bên cạnh") used as the speaker label. Sessions saved before this field existed fall back to the catalog by key.

## Out of scope

- Auto-playing the AI reply. It would add one TTS call per turn; the "Nghe" button stays.
- Streaming the reply text, or merging `transcribe` and `reply` into one request.

## Verification

`npm test`, `npm run check` and `npm run build`. Manual: start a scenario, record a turn, type a turn, tick a goal, listen to a reply, end the session, reopen `?session=<id>`, on desktop and at phone width.
