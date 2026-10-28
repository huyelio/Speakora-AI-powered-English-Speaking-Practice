# A5 topic icons

Date: 2026-10-28. Status: done.

## Goal

Replace the purple 3D topic art from the previous UI with icons that fit the A5
palette, while keeping the soft 3D clay look learners already recognise.

## Outcome

- `public/images/topics/<slug>.webp` now holds one set of 17 transparent 512px
  icons used by both `TopicIcon` (`src/components/ui/topic-icon.tsx`) and
  `TopicIllustration` (`src/components/topics/topic-illustration.tsx`). The 15
  legacy PNGs and the purple square WebP thumbnails are gone.
- Session thumbnails use `object-fit: contain` with a small inset, so the
  transparent icon sits on the existing A5 thumbnail background.
- The `clip-path` workaround for detached fragments in the old travel and
  hobbies exports was removed; the new files are trimmed.

## How the icons were made

Model: `chatgpt-image-latest` via `POST /v1/images/edits` (the only image model
on the project key; `gpt-image-1` was not available), 1024x1024, `quality:
medium`, `background: transparent`.

1. Recolor: each legacy PNG was sent with a prompt to keep the object,
   composition, camera angle and clay rendering and change only the palette.
   Purple was banned; the palette was the A5 hex set (orange #c8562b, mustard
   #e0a526, olive #6b7a3a, teal #2f6f6a, rose #d98b73, brown #6e5442, cream
   #f4ead5, tan #e3d3b4). The approved travel result then served as a second
   reference image for the rest of the set.
2. Per-topic accent so neighbouring cards differ: daily-routine, hobbies,
   transportation mustard; family-friends, shopping rose; future-plans,
   movies-music, education teal; health-fitness, study, community olive;
   home-neighborhood, social-situations orange. Travel, food-cooking, work and
   technology came from the first approved round.
3. Community and education had no legacy 3D icon and were drawn from the
   travel reference plus a subject description (houses with a heart bubble;
   books with a graduation cap).
4. Post-processing with sharp: trim to the alpha bounding box, pad to a centred
   square with an 8% margin, resize to 512px, WebP q90 with lossless-quality
   alpha. Edges were checked on the A5 cream background for white fringe and
   stray specks; none were visible. Some icons keep a faint built-in contact
   shadow.

A flat 2D style round (mid-century, risograph, gouache) was tried first and
rejected in favour of the recolored 3D look.

## Follow-ups

- Study and education share the books-and-cap motif; regenerate one if both
  appear side by side.
- New topics need a matching icon; until then they fall back to the SVG icon.
