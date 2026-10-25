// Server-only helpers for the diagnostic server functions.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const RW_M1_COUNT = 27;
export const RW_M2_COUNT = 27;
export const MATH_M1_COUNT = 22;
export const MATH_M2_COUNT = 22;

// Helper: pick questions from the bank, optionally biased by difficulty.
export async function pickQuestions(
  supabase: SupabaseClient<Database>,
  section: "math" | "reading_writing",
  count: number,
  difficultyHint: "easy" | "hard" | "mixed",
) {
  let query = supabase
    .from("questions")
    .select(
      "id,section,question_text,answer_a,answer_b,answer_c,answer_d,skill_category,skill_subcategory,difficulty,has_visual,visual_type,visual_data,visual_svg",
    )
    .eq("is_active", true)
    .eq("section", section);

  if (difficultyHint === "easy") query = query.in("difficulty", [1, 2]);
  else if (difficultyHint === "hard") query = query.in("difficulty", [2, 3]);

  const { data: pool } = await query.limit(200);
  if (!pool || pool.length === 0) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
