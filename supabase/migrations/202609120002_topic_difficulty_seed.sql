-- Seed topic-level difficulty for General English practice topics.
-- Difficulty describes the topic as a learning unit, not per-question filters.
-- IELTS/TOEIC topics are left null; guest IELTS sessions do not use topic difficulty.

update public.topics t
set
  difficulty_level = v.difficulty_level,
  updated_at = now()
from (
  values
    -- BEGINNER: concrete everyday life
    ('daily-routine', 'BEGINNER'),
    ('family-and-friends', 'BEGINNER'),
    ('food-and-cooking', 'BEGINNER'),
    ('hobbies', 'BEGINNER'),
    ('home-and-neighborhood', 'BEGINNER'),
    ('shopping', 'BEGINNER'),
    ('transportation', 'BEGINNER'),
    ('travel', 'BEGINNER'),
    -- INTERMEDIATE: opinions, planning, work, media, technology
    ('community', 'INTERMEDIATE'),
    ('future-plans', 'INTERMEDIATE'),
    ('health-and-fitness', 'INTERMEDIATE'),
    ('movies-and-music', 'INTERMEDIATE'),
    ('social-situations', 'INTERMEDIATE'),
    ('study', 'INTERMEDIATE'),
    ('technology', 'INTERMEDIATE'),
    ('work', 'INTERMEDIATE')
) as v(slug, difficulty_level)
join public.practice_modes pm
  on pm.code = 'GENERAL'
 and pm.is_active
where t.slug = v.slug
  and t.mode_id = pm.id;
