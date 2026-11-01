# Language setting and English UI

Date: 2026-10-31. Status: implemented. Behaviour is described in [docs/architecture/i18n.md](../architecture/i18n.md).

## Decisions

- Translate on-screen UI text only. Logs and internal messages stay as they are.
- AI feedback follows the UI language. Saved results keep their language.
- Vocabulary meanings stay Vietnamese.
- Vietnamese is the default for guests and new users.
- Vietnamese source strings are the dictionary keys, instead of separate `vi` and `en` files, so components keep working without a provider and only `en.ts` has to be maintained.

## Follow-up

- Apply `supabase/migrations/202610310001_profile_locale.sql`. Until then the choice works per browser through the cookie only.
