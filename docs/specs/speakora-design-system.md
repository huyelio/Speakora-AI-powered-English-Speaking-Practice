# Speakora Design System

## Direction

Speakora uses the **Friendly Playful** visual direction selected in `concept-2-playful.html`: warm, approachable, spacious and focused without looking childlike. The template is the visual reference; all content and functionality come from the existing application. The existing theme preference and toggle remain available, with a matching warm dark palette.

Avoid heavy gradients, glassmorphism, decorative AI motifs, fake social proof, emoji icons, and game-like ornament. Practice screens should reduce distraction; result and progress screens may carry more information while preserving a clear reading order.

## Foundations

- **Typography:** Segoe UI with Arial/system sans-serif fallbacks. Body text is 15px with a 1.6 line height; headings use restrained tracking and medium-to-semibold weights.
- **Primary:** purple `#645094`; solid button hover `#554080`.
- **Accent:** peach `#f5d9c3` supports feedback and encouragement. Semantic green, amber and red distinguish success, attention and errors with accompanying text.
- **Surfaces:** cream `#fcf8f3` background, lavender `#eee7f4` practice studio, warm neutral conversation bubbles and quiet form surfaces. Avoid decorative borders, blur and heavy shadows.
- **Shape:** controls use 15px radii; primary studios use 25-30px radii; conversation bubbles use asymmetric 17px corners. The microphone has a shallow tactile shadow.
- **Spacing:** use a 4px-based scale. Primary touch targets are at least 44px high.
- **Motion:** interaction transitions use 150-220ms and must respect `prefers-reduced-motion`.

Semantic CSS custom properties are the implementation source of truth. Components consume semantic tokens rather than raw color values.

`src/app/friendly-playful.css`, loaded after the existing structural stylesheet, defines this presentation. Desktop content is approximately 1160px wide with a 28px column gap. Mobile uses 20px gutters and stacks the practice studio above session context. Recording, playback, review, processing, retry and result components retain their existing behavior.

## Component Principles

- Labels remain visible above form controls; placeholders are examples, never labels.
- Errors appear near the affected form, use accessible alert semantics, and preserve user input.
- Loading and success states are explicit and do not rely on color alone.
- Focus rings remain visible for keyboard users.
- Password fields support password managers, paste, and an accessible show/hide control.
- Icons are simple SVGs or text controls with accessible names; decorative marks are hidden from assistive technology.

## Auth Experience

Desktop Auth pages use a two-region shell: a concise learning promise on the left and a focused form card on the right. Mobile collapses to a single column and keeps the form above secondary content.

Registration supports both Supabase configurations:

- With email confirmation disabled, a returned session redirects directly into onboarding.
- With email confirmation enabled, a missing session renders a clear check-email state and the confirmation link returns through the server callback.

Sign-in, sign-up, password reset, and password update share the same shell, form controls, feedback patterns, and navigation language.

## Application Coverage

Shared navigation, dashboard, topics, profile, authentication, vocabulary, pronunciation, conversation and practice/results use the same warm typography, surfaces, controls and focus treatment. Existing modes and data contracts remain authoritative. Practice places the real question and microphone inside the lavender studio and shows submitted question context beside it; it does not fabricate conversation responses.
