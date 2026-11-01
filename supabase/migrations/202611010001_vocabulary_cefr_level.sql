-- Per-word CEFR estimate for display. Labels are AI-assigned and unverified.
-- `level` still drives selection, so each label must stay inside its level's range.

alter table public.vocabulary_items
  add column if not exists cefr_level text,
  add constraint vocabulary_items_cefr_level_check check (
    cefr_level is null
    or (level = 'BEGINNER' and cefr_level in ('A1', 'A2'))
    or (level = 'INTERMEDIATE' and cefr_level in ('B1', 'B2'))
    or (level = 'ADVANCED' and cefr_level in ('C1', 'C2'))
  );
