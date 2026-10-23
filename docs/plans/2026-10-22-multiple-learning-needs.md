# Multiple learning needs

Use checkboxes for the ten existing need categories. Persist selections in a
new profiles.learning_purposes text array, retaining learning_purpose for legacy
readers. Extend the atomic onboarding RPC with an optional array argument and
backfill existing single selections. IELTS in any selection requires a clearly
labeled IELTS band; removing IELTS clears its score. Continue accepting legacy
single-goal API requests. Validate nonempty, bounded, recognized selections.

Verify profile rendering, API validation, repository mapping, onboarding and
TypeScript. Applying the SQL migration is required before live use.
