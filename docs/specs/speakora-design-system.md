# Speakora Design System

## Direction

Speakora uses direction **A5 (warm retro)**, chosen on 2026-10-26 from seven standalone previews in [docs/design-preview/](../design-preview/) (reference: `a5-hoai-co.html`). It is warm, editorial and a little nostalgic: cream paper, brown outlines, flat mustard/orange/olive/teal fills and a four-colour stripe motif. The UI is **light only**; there is no theme toggle or dark palette. A stored `speakora-theme` value is ignored.

Avoid purple-blue gradients, glassmorphism, emoji icons, decorative AI motifs, fake social proof, and identical rounded-and-shadowed cards everywhere. Practice screens reduce distraction; hubs and progress screens may carry more colour.

Labels are Vietnamese. English appears only in learning content (words, questions, transcripts). Do not expose internal names such as "V2" or use English uppercase eyebrows.

## Foundations

- **Tokens:** [src/app/tokens.css](../../src/app/tokens.css) is the single source of truth. `--a5-*` primitives define semantic `--color-*`, radius, spacing and line tokens; components consume semantic tokens only. Legacy stylesheets were retokenized to these names.
- **Typography:** Fraunces (display, variable `opsz` and `SOFT`, `WONK` off) for h1–h3; Work Sans for body and controls. Both load through `next/font/google` with the `vietnamese` subset. Body text is 15–16px with 1.6 line height.
- **Vietnamese diacritics (verified 2026-10-26 with `docs/design-preview/fraunces-vietnamese.html`, 24–96px):** headings need a line-height of at least **1.15**; at 1.05 stacked marks on wrapped lines (Ẩ, ữ, ệ) nearly touch the descenders above. Tracking tighter than −0.02em crowds marks. `WONK` is disabled because its italic `h`/`n` alternates read poorly in Vietnamese; italic Fraunces is allowed for short accent phrases.
- **Colour:** cream `#f4ead5` background, paper `#fbf5e8` surfaces, brown `#3b2a1e` text and outlines. Action orange is the text-safe `#a8461f` (cream text passes 4.5:1); the brighter `#c8562b` is decorative or large text only. Mustard `#e0a526` always carries brown text, never white. Olive, teal and rose distinguish secondary modes; success, warning and error text tokens meet 4.5:1 on cream and on their soft fills.
- **Shape:** 2px brown outlines instead of shadows; pill controls; 24–32px radii for cards; arch-topped cards for hub choices.
- **Spacing:** 4px scale. Touch targets are at least 44px.
- **Motion:** 150–350ms transitions; every animation stops under `prefers-reduced-motion`.

Recording, playback, review, processing, retry and result components retain their existing behaviour.

## Component Principles

The shared page background uses low-opacity SVG waves and small learning icons
near the viewport edges, with a quieter center to preserve content contrast.
Slow drift and bounded pointer parallax are decorative only; reduced-motion
preferences disable movement, and touch devices do not use pointer parallax.
The background does not intercept clicks or appear in the accessibility tree.

- Labels remain visible above form controls; placeholders are examples, never labels.
- Errors appear near the affected form, use accessible alert semantics, and preserve user input.
- Loading and success states are explicit and do not rely on color alone.
- Focus rings remain visible for keyboard users.
- Password fields support password managers, paste, and an accessible show/hide control.
- Icons are simple SVGs or text controls with accessible names; decorative marks are hidden from assistive technology.

## Auth Experience

Sign-in follows the supplied two-column welcome reference: a translucent
cream brand/story region with local 3D topic illustrations, and a spacious
form card with email/password icons. Global animated waves remain visible
through the page background. Mobile prioritizes the compact brand and form.
All authentication pages share this welcome layout, including sign-up,
password recovery, password update and confirmation feedback. The logo has no
separate tagline; email and password fields share the illustrated control style.

Desktop Auth pages use a two-region shell: a concise learning promise on the left and a focused form card on the right. Mobile collapses to a single column and keeps the form above secondary content.

Registration supports both Supabase configurations:

- With email confirmation disabled, a returned session redirects directly into onboarding.
- With email confirmation enabled, a missing session renders a clear check-email state and the confirmation link returns through the server callback.

Sign-in, sign-up, password reset, and password update share the same shell, form controls, feedback patterns, and navigation language.

## Application Coverage

Profile uses the concise heading “Đánh giá kỹ năng” and omits motivational
helper copy above its sections. Shared learner preference fields present ten
need categories with descriptions: daily communication, study, work, interviews,
certification exams, travel, studying/living abroad, public speaking,
international social connections, and personal development. Existing stored
goal values remain accepted, including IELTS and TOEIC under certification.

Needs allow multiple checkbox selections with at least one required. Selecting
certification exposes “Band mục tiêu IELTS”; other needs may remain selected.
Removing certification clears its band. Profile summaries show all saved needs.
The multiple-needs migration adds `profiles.learning_purposes` and extends the
atomic onboarding RPC; it must be applied before deploying this UI.

Brand surfaces share the supplied PNG logo through `Brand`. Explore cards,
dashboard recommendations, topic heroes and session topic thumbnails share the
17 local 3D clay WebP assets in `public/images/topics` (transparent, 512px,
recolored to the A5 palette; see `docs/plans/2026-10-28-a5-topic-icons.md`),
mapped by known topic slug with a generic SVG fallback.
Images use contained proportions and decorative empty alternatives where the
topic name is already visible. The dashboard hero reuses these topic assets.

Shared navigation, dashboard, topics, profile, authentication, vocabulary, pronunciation, conversation and practice/results use the same warm typography, surfaces, controls and focus treatment. Existing modes and data contracts remain authoritative. Practice places the real question and microphone inside the practice studio and shows submitted question context beside it; it does not fabricate conversation responses.

IELTS practice uses an examiner-first conversation layout, with the supplied
local examiner illustrations beside the dynamic question and Part 2 cue points.
Actual question playback, recording and upload/processing state select the
examiner illustration. A circular microphone and Listen / Speak / Review /
Submit indicator reuse the existing explicit-review workflow. The quiet sidebar
shows accepted-answer progress, current question and part, session status, one
general speaking tip, and expandable submitted-question history. It adds no
translation, notes, estimated session timer or synthetic waveform. Mobile stacks
the examiner, question, controls and session context; reduced motion remains supported. General practice and result views
retain their existing presentation. Styles live in
`src/components/practice/ielts-practice.css`.
