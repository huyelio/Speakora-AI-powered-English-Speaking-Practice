# Session setup visual unification

## Scope

Align Vocabulary, Pronunciation, and Speaking by Topic setup surfaces with the existing pronunciation topic-card treatment. Keep all session creation, filters, levels, counts, routes, and data contracts unchanged.

## Implementation

1. Extract the existing local topic illustration lookup and thumbnail rendering into one small shared topic helper/component.
2. Replace Vocabulary's topic select with the same accessible radio-card grid while retaining its level and item-count controls.
3. Update Speaking's existing topic links to use the same thumbnail/card dimensions and question-count metadata without changing navigation behavior.
4. Apply shared setup-page/card/action classes where they match, leaving mode-specific controls and supporting content intact.
5. Add focused rendering tests for shared image mapping, fallback thumbnails, metadata, and selected state; run focused tests and TypeScript checking.

## Non-goals

- No database, API, session-creation, topic-schema, IELTS, practice, or results changes.
- No new universal form architecture or broad component refactor.
