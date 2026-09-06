# Vietnamese UI Copy Design

## Goal

Make all learner-facing Speakora interface copy natural, concise Vietnamese while preserving English practice questions and technical data contracts.

## Scope

- Translate visible headings, descriptions, navigation, buttons, labels, statuses, hints, empty states, loading states, and errors across Auth, onboarding, Dashboard, Explore, Profile, History, Practice, Processing, and Result.
- Translate API error message values when they may be shown by the UI.
- Keep IELTS, TOEIC, Speaking, and AI where they are clearer than Vietnamese alternatives.
- Keep English question prompts, topic data loaded from the database, enums, API field names, identifiers, logs, and internal-only exceptions unchanged.

## Implementation

Edit copy at its existing usage sites. Do not add an i18n framework or translation abstraction. Preserve the current design system; only allow text wrapping and small spacing adjustments required by longer Vietnamese copy.

Use a consistent learner-friendly vocabulary: “phiên luyện tập”, “câu trả lời”, “đang xử lý”, “thử lại”, “chưa có dữ liệu”, and “mục tiêu hôm nay”. Avoid literal, formal, or technical translations.

## Verification

Update focused rendering and API tests before each affected copy group, verify the intended failures, then implement the translations. Run the full Vitest suite, TypeScript check, production build, and a final source scan for remaining learner-facing English strings.
