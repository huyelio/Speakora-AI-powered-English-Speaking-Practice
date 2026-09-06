# Speakora Design System

## Direction

Speakora uses a **Modern Learning + Calm Confidence** visual language: contemporary, friendly, focused, and trustworthy without looking corporate or childlike. The default experience is light, spacious, and content-led.

Avoid heavy gradients, glassmorphism, decorative AI motifs, fake social proof, emoji icons, and game-like ornament. Practice screens should reduce distraction; result and progress screens may carry more information while preserving a clear reading order.

## Foundations

- **Typography:** Plus Jakarta Sans for headings and body copy, with system sans-serif fallbacks. Body text is at least 16px with a 1.5 line height.
- **Primary:** indigo `#4F46E5`; interactive hover/pressed state `#4338CA`.
- **Accent:** cyan is reserved for supporting information. Emerald communicates success and learning progress.
- **Surfaces:** off-white application background, white cards, slate foreground text, quiet neutral borders.
- **Shape:** controls use 12px radii; cards use 16-18px radii. Shadows are soft and shallow.
- **Spacing:** use a 4px-based scale. Primary touch targets are at least 44px high.
- **Motion:** interaction transitions use 150-220ms and must respect `prefers-reduced-motion`.

Semantic CSS custom properties are the implementation source of truth. Components consume semantic tokens rather than raw color values.

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

## Future Adoption

Dashboard, IELTS, TOEIC Speaking, General English, History, Result, and Progress screens should adopt these tokens and primitives incrementally. Practice remains the most restrained surface; data-rich screens may use denser layouts but must keep the same typography, color semantics, spacing rhythm, and accessibility rules.
