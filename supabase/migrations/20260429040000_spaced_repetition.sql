-- Re-scope review_schedule to track spaced repetition per SKILL, not per
-- question. Rationale (see conversation): resurfacing the literal same
-- question risks the student recognizing it rather than re-deriving it, and
-- with a small/uneven question bank (currently ~460 questions, almost all
-- math) a question-level schedule would hit repeats often. Skill-level
-- scheduling decides WHEN to review a weak skill; serve-time logic picks a
-- fresh unseen question in that skill first, falling back to a repeat only
-- if that skill's pool is exhausted.
ALTER TABLE public.review_schedule DROP CONSTRAINT review_schedule_question_id_fkey;
ALTER TABLE public.review_schedule DROP COLUMN question_id;
ALTER TABLE public.review_schedule DROP CONSTRAINT IF EXISTS review_schedule_student_id_question_id_key;

ALTER TABLE public.review_schedule ALTER COLUMN skill_category SET NOT NULL;
ALTER TABLE public.review_schedule ADD COLUMN skill_subcategory TEXT NOT NULL DEFAULT '';

ALTER TABLE public.review_schedule
  ADD CONSTRAINT review_schedule_student_skill_key UNIQUE (student_id, skill_category, skill_subcategory);

-- skill_performance has the same latent bug this migration avoids
-- reintroducing: its existence-check queries skill_subcategory = '' while
-- its insert writes the raw (possibly NULL) value, so a skill with no
-- subcategory never matches on lookup and gets a fresh duplicate row every
-- time instead of accumulating. Normalize it the same way.
UPDATE public.skill_performance SET skill_subcategory = '' WHERE skill_subcategory IS NULL;
ALTER TABLE public.skill_performance ALTER COLUMN skill_subcategory SET NOT NULL;
ALTER TABLE public.skill_performance ALTER COLUMN skill_subcategory SET DEFAULT '';
