# Role-play chat feel: auto voice, listen animation, avatars

Date: 2026-10-30. Status: implemented.

## Goal

Make an AI role-play session feel like a messenger chat:

1. After the learner sends a turn, the AI "typing" indicator covers both reply generation and TTS loading. The reply text appears when its voice starts playing.
2. Pressing **Nghe** animates the bubble (loading dots, then sound bars while playing), like a voice message.
3. Both sides have avatars. The AI avatar is a generated portrait per scenario; the learner avatar is their initial, as in the header.

## Behaviour

- A new assistant line (opening line or reply) is held back while its TTS loads, with the typing indicator still showing. It is revealed on `playing`.
- The text never waits on audio. It is revealed after `AUTO_VOICE_REVEAL_MS` (4 s) even if the voice is still loading, and immediately if TTS fails or the browser blocks autoplay. Blocked autoplay shows no error, only the normal **Nghe** button.
- Only lines that arrive during this mount auto-play. Sessions reopened from history or after a reload do not.
- A toggle, **Tự phát giọng AI**, defaults to on and is kept in `localStorage` as a per-browser convenience (read and written inside try/catch).
- One `<audio>` element is reused and unlocked with a silent clip on the learner's mic or send gesture, so Safari allows the later auto-play.
- With reduced motion, the sound bars stay still.
- Avatars follow messenger grouping: an avatar shows on the last bubble of a run from the same speaker.

## Scope

- Client only: no API, database or worker changes.
- `src/components/conversation/conversation-session.tsx`: reveal state, auto voice, voice animation, chat header, avatars.
- `src/components/conversation/conversation.module.css`: rows, avatars, header, sound bars.
- `src/modules/conversation/catalog.ts`: `scenarioAvatar(key)`.
- `scripts/conversation-art.ts --avatars`: portraits in `public/images/conversation/avatars/`.
- `src/app/(learn)/conversation/session/page.tsx`: passes the learner display name.
- Tests: hidden line while voice loads, fresh-line detection, avatar grouping.
