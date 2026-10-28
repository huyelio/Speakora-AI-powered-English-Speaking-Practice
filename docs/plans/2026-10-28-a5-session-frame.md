# A5 session frame: no page scroll, template-aligned sessions

Approved 2026-10-28. This applies to two screens: the Vocabulary Learning V2 session (template `screen-recall`) and the question-based speaking session `PracticeSession`, which covers topic practice, IELTS, Quick Check and the guest demo (template `screen-speak`). The reference is [a5-hoai-co.html](../design-preview/a5-hoai-co.html). Only existing tokens are used.

## Scroll problem

Both screens were long documents. Status (stage chips, "Từ x / n", the "Câu x/5" pill and progress) sat at the top, and the primary action (mic, Tiếp tục, Gửi) sat at the bottom of the card. On a 900px desktop and on phones, learners had to scroll between them.

**Frame.** Inside the app shell, a session fills exactly the viewport below the header (`100dvh`) using a grid with three rows:

- a top status row;
- a body that scrolls on its own (`min-height: 0; overflow: auto`) and holds long content such as transcripts, AI feedback and the summary;
- an action bar at the bottom that is always visible.

The shell only switches to this mode while a `.a5-session` is present (`:has()`), so other pages are unchanged. On phones the frame leaves room above the floating tab bar, including the safe-area inset. Outside the app shell (guest demo, onboarding Quick Check) the frame falls back to normal page flow.

## Deviations from the template

| Area | Template | Before |
|---|---|---|
| Layout | Main column plus a 300–320px side panel (`r-grid`, `sp-grid`) | V2: one narrow centred column. Speaking: card plus a companion with a purple avatar |
| V2 header | Round × exit plus step chips in one row; done chips are olive with a check icon | Uppercase eyebrow, large H1 with the stage name, chips on their own line, then "Từ 2 / 6" on another line; no check icons |
| V2 counter | Inside the card: "Du lịch · từ 3 trên 10" | Separate line above the card |
| V2 side | "Bộ từ …" box with progress beads (olive = right, rose = review, mustard = current) | None |
| Speaking header | Segment control and progress dots (olive done, mustard pill current) | Topbar with English topic name and a "2/5" pill, then an uppercase eyebrow, a large H1, a lead line and a progress bar |
| Question | Teal speech bubble (radius 32/32/32/6) with a small "Câu 2 / 5 · topic · level" line, a large Fraunces question in paper colour, and a pill listen button | Paper card, brown question, uppercase tag, faint text-only "Nghe câu hỏi" |
| Mic | A "deck": striped circular knob, Fraunces label, italic timer | Orange rounded-square button inside the card |
| Transcript | Lined notebook card "Bạn vừa nói" | Plain card |
| Actions | Teal "Gửi câu trả lời", ghost "Ghi lại" | Legacy `ps-btn` styles |
| Side boxes | "Từ nên dùng" (mustard word pills), "Bối cảnh", "Đã trả lời" with olive checks | Purple avatar (off-palette), uppercase "CÁC CÂU VỪA LUYỆN", mustard note |
| Copy | Sentence-case Vietnamese, Vietnamese topic names | Uppercase eyebrows ("LUYỆN NÓI TIẾNG ANH", "NGHE · NÓI · CẢI THIỆN"); English topic names |

## Changes

- `src/components/session-frame/session-frame.css` holds the frame, the shell `:has()` sizing, the top row, the body and side, the action bar, the deck and knob, the bubble, the lined card, the boxes, the beads and the dots. It uses tokens only.
- V2 (`LearningSessionView`):
  - The top row has a round exit link to the topic page and chips with checks.
  - The card shows the counter.
  - A "Bộ từ" side box shows beads.
  - Stage actions move into the action bar. LearnWord, PronunciationCard and the Summary use a portal; Recall uses a `form` attribute.
- `PronunciationCard` takes an optional `actionsTarget`. When it is set, the recorder and the action buttons render there through a portal. The standalone pronunciation session is unchanged.
- `PracticeSession`:
  - The top row has the exit button, the count and the progress dots (still exposed as a progressbar).
  - The question is shown in a bubble.
  - The review audio and the lined transcript stay in the body.
  - The action bar holds the deck: knob, label and timer, or Gửi / Ghi lại.
  - Side boxes show topic words, context and the answered list. IELTS keeps its examiner and info panel inside the frame.
  - Result and processing scroll inside the body.

## Out of scope (listed, not fixed)

These have the same scroll pattern: the flashcard session, the standalone pronunciation session and AI role-play. The legacy `ps-*` rules in `globals.css` and `friendly-playful.css` become unused by the new markup and can be removed separately.

## Verification

`npm test`, `npm run check` and `npm run build` pass. Desktop (1440×900) and mobile (390×844) screenshots are taken from `/dev-preview/session` for each state.
