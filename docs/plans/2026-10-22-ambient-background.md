# Subtle ambient background

Implement the approved wave background with muted brand colors, slow motion,
small learning icons near the edges, and bounded pointer parallax. The center
stays quiet so learning content remains dominant. Use a shared decorative SVG
layer rather than image/video assets or an animation dependency.

Keep the layer outside normal layout, hidden from assistive technology, and
unable to intercept interaction. Use existing semantic theme tokens. Respect
reduced motion and avoid pointer parallax on touch devices. Clean up listeners
and scheduled frames when unmounted. Preserve existing user asset changes.

Validation: focused server-render accessibility test, TypeScript check, and
production build. Browser visual assessment remains separate from these checks.
