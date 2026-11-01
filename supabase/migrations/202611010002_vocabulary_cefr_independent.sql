-- A word's CEFR estimate is now independent of the topic-derived `level`:
-- a BEGINNER topic such as travel also holds harder words like "itinerary".

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_cefr_level_check,
  add constraint vocabulary_items_cefr_level_check check (
    cefr_level is null or cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  );
