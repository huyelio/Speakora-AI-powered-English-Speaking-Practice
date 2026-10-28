# Shared TTS service and cache

Approved 2026-10-27.

## Problem

"Nghe phát âm mẫu" and the other listen buttons sometimes took a long time to play. Every click synthesized fresh audio. No layer cached it, and OpenAI calls had no timeout. In the baseline, most calls took 1.3–3.8s, but two outliers took 14.8s and 153s.

## Decisions

- One endpoint, `GET /api/tts?kind=&session=&item=`, backed by `src/modules/tts/`. It replaces `/api/vocabulary/sessions/:id/tts`, `/api/pronunciation/sessions/:id/tts`, `/api/speech/tts` and the conversation `action: "tts"`. GET lets the browser cache fixed audio.
- Two classes of content:
  - **Fixed bank text** (vocabulary words, ACTIVE IELTS/General prompts, role-play openings) goes to the private `tts-cache` bucket. The key is a SHA-256 of text, model, voice, speed, instructions and format. Responses send `Cache-Control: private, max-age=604800, immutable`.
  - **Per-learner AI text** (role-play replies) is never cached. It streams from OpenAI to the `<audio>` element with `no-store`.
- Timeouts. OpenAI gets 10s to start answering. Buffered calls are bounded end to end, and streams are capped at 60s. The browser waits 15s. Every listen button switches to "Thử nghe lại" after a failure.
- Learn and Pronounce request the same word through the same request builder, so they share one cache object.
- `npm run tts:prebuild` fills the cache; `--dry-run` reports counts and an estimated cost first.
- The legacy `/api/demo/speech`, which has no UI caller and takes free text, only gains the 10s timeout.

## Out of scope

Prebuilding the 30 DRAFT and 3 TOEIC prompts. They are generated and cached on demand if they are ever used.

## Verification

- Unit tests cover cache keys, hit and miss handling, source classification, route headers and the timeout.
- `npm test`, `npm run check` and `npm run build` pass.
- Latency is compared before and after per mode, using the same measurement script.
