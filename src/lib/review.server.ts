import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Upserts skill_performance for one answered question. Shared by the
 * diagnostic and practice submit handlers so the accuracy tracking (and its
 * null-subcategory handling) only exists in one place.
 */
export async function recordSkillAttempt(
  supabase: Client,
  studentId: string,
  skillCategory: string,
  skillSubcategory: string | null,
  isCorrect: boolean,
) {
  const sub = skillSubcategory ?? "";
  const { data: existing } = await supabase
    .from("skill_performance")
    .select("id,correct_count,total_attempts")
    .eq("student_id", studentId)
    .eq("skill_category", skillCategory)
    .eq("skill_subcategory", sub)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("skill_performance")
      .update({
        correct_count: existing.correct_count + (isCorrect ? 1 : 0),
        total_attempts: existing.total_attempts + 1,
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("skill_performance").insert({
      student_id: studentId,
      skill_category: skillCategory,
      skill_subcategory: sub,
      correct_count: isCorrect ? 1 : 0,
      total_attempts: 1,
    });
  }
}

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.0;

/**
 * Spaced repetition, scheduled per SKILL rather than per question (see the
 * migration comment for why). SM-2 adapted for binary correct/incorrect
 * grading instead of SM-2's usual 0-5 quality scale:
 *
 * - A skill only enters the schedule once it's been missed — we don't
 *   bother tracking review timing for things the student has never gotten
 *   wrong.
 * - A miss resets repetitions to 0, drops the ease factor, and schedules
 *   the next review for tomorrow.
 * - A hit (only meaningful once the skill is already being tracked) grows
 *   the interval — 1 day, then 6, then interval * ease_factor — and nudges
 *   the ease factor up, same shape as standard SM-2.
 *
 * Which literal question the student sees is decided at serve time by
 * startPractice's existing "prefer unseen" sampling, not by this function.
 */
export async function updateReviewSchedule(
  supabase: Client,
  studentId: string,
  skillCategory: string,
  skillSubcategory: string | null,
  isCorrect: boolean,
) {
  const sub = skillSubcategory ?? "";
  const { data: existing } = await supabase
    .from("review_schedule")
    .select("id,ease_factor,interval_days,repetitions")
    .eq("student_id", studentId)
    .eq("skill_category", skillCategory)
    .eq("skill_subcategory", sub)
    .maybeSingle();

  const today = new Date();
  const nextDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  if (!existing) {
    if (isCorrect) return; // never missed -- nothing to schedule
    await supabase.from("review_schedule").insert({
      student_id: studentId,
      skill_category: skillCategory,
      skill_subcategory: sub,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review_date: nextDate(1),
      last_reviewed_at: today.toISOString(),
    });
    return;
  }

  if (!isCorrect) {
    await supabase
      .from("review_schedule")
      .update({
        ease_factor: Math.max(MIN_EASE_FACTOR, existing.ease_factor - 0.2),
        interval_days: 1,
        repetitions: 0,
        next_review_date: nextDate(1),
        last_reviewed_at: today.toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  const repetitions = existing.repetitions + 1;
  const easeFactor = Math.min(MAX_EASE_FACTOR, existing.ease_factor + 0.1);
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(existing.interval_days * easeFactor);

  await supabase
    .from("review_schedule")
    .update({
      ease_factor: easeFactor,
      interval_days: intervalDays,
      repetitions,
      next_review_date: nextDate(intervalDays),
      last_reviewed_at: today.toISOString(),
    })
    .eq("id", existing.id);
}

/** Skills currently due for review (next_review_date <= today). */
export async function getDueSkills(supabase: Client, studentId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("review_schedule")
    .select("skill_category,skill_subcategory,next_review_date,interval_days")
    .eq("student_id", studentId)
    .lte("next_review_date", today)
    .order("next_review_date", { ascending: true });
  return data ?? [];
}
