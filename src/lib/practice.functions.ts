import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordSkillAttempt, updateReviewSchedule, getDueSkills } from "@/lib/review.server";

// ─────────────────────────────────────────────────────────────────
// Start a practice session — picks questions weighted to weak skills
// ─────────────────────────────────────────────────────────────────
const startPracticeSchema = z.object({
  section: z.enum(["math", "reading_writing", "mixed"]).default("mixed"),
  skillCategory: z.string().nullable().optional(),
  count: z.number().int().min(5).max(30).default(10),
});

export const startPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => startPracticeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Abandon any open practice session
    await supabase
      .from("test_sessions")
      .update({ status: "abandoned" })
      .eq("student_id", userId)
      .eq("session_type", "practice")
      .eq("status", "in_progress");

    const { data: session, error } = await supabase
      .from("test_sessions")
      .insert({
        student_id: userId,
        session_type: "practice",
        status: "in_progress",
      })
      .select("id")
      .single();
    if (error || !session) throw new Error(error?.message || "Failed to start practice");

    // Both skill_performance and review_schedule track accuracy/scheduling
    // at (skill_category, skill_subcategory) granularity, not just category
    // -- weighting has to match that exactly, or a due/weak subcategory like
    // "Advanced Math :: Quadratic Functions" ends up pulling from the whole
    // "Advanced Math" category (including unrelated subcategories) instead
    // of its own narrower topic.
    const skillKey = (category: string, subcategory: string | null) =>
      `${category}::${subcategory ?? ""}`;

    // Skill weighting: pull skill_performance, lower accuracy → higher weight
    const { data: perf } = await supabase
      .from("skill_performance")
      .select("skill_category,skill_subcategory,correct_count,total_attempts")
      .eq("student_id", userId);

    const skillWeight = new Map<string, number>();
    for (const p of perf ?? []) {
      if (!p.total_attempts) continue;
      const acc = p.correct_count / p.total_attempts;
      const key = skillKey(p.skill_category, p.skill_subcategory);
      skillWeight.set(key, Math.max(skillWeight.get(key) ?? 0, 1 - acc + 0.2));
    }

    // Spaced-repetition boost: a skill due for review outranks plain
    // accuracy weighting, so it surfaces even if its accuracy looks fine now.
    const dueSkills = await getDueSkills(supabase, userId);
    const dueSkillSet = new Set(
      dueSkills.map((d) => skillKey(d.skill_category, d.skill_subcategory)),
    );
    for (const d of dueSkills) {
      const key = skillKey(d.skill_category, d.skill_subcategory);
      skillWeight.set(key, Math.max(skillWeight.get(key) ?? 0, 3));
    }

    // Every question this student has already answered (practice or diagnostic)
    const { data: seenRows } = await supabase
      .from("student_responses")
      .select("question_id")
      .eq("student_id", userId)
      .limit(10000);
    const seenIds = new Set((seenRows ?? []).map((r) => r.question_id));

    // Pull a pool
    let query = supabase
      .from("questions")
      .select(
        "id,section,question_text,answer_a,answer_b,answer_c,answer_d,skill_category,skill_subcategory,difficulty,has_visual,visual_type,visual_data,visual_svg",
      )
      .eq("is_active", true);
    if (data.section !== "mixed") query = query.eq("section", data.section);
    if (data.skillCategory) query = query.eq("skill_category", data.skillCategory);

    const { data: pool } = await query.limit(2000);
    if (!pool || pool.length === 0)
      throw new Error("No questions available — ask an admin to seed the question bank.");

    // Score and sample. Priority order: a skill due for review outranks
    // everything else (even an unseen question elsewhere), since the whole
    // point of it being due is to resurface it now. Within a due skill,
    // prefer an unseen question at the HARDEST available difficulty --
    // don't hand back an easier question than necessary, only fall to one
    // once nothing harder/equal is left unseen -- and fall back to
    // repeating an already-seen question only once that skill's entire
    // pool, at every difficulty, is exhausted. Outside of due skills,
    // unseen questions come first as before, with no difficulty preference.
    const scored = pool.map((q) => {
      const key = skillKey(q.skill_category, q.skill_subcategory);
      const w = data.skillCategory ? 1 : (skillWeight.get(key) ?? 0.5);
      const unseen = seenIds.has(q.id) ? 0 : 1;
      const due = dueSkillSet.has(key) ? 1 : 0;
      return { q, due, unseen, score: w * (0.5 + Math.random()) };
    });
    scored.sort(
      (a, b) =>
        b.due - a.due ||
        b.unseen - a.unseen ||
        (a.due && b.due ? b.q.difficulty - a.q.difficulty : 0) ||
        b.score - a.score,
    );
    const picked = scored.slice(0, data.count).map((s) => s.q);

    return { sessionId: session.id, questions: picked };
  });

// ─────────────────────────────────────────────────────────────────
// Submit one practice answer at a time — returns correctness immediately
// ─────────────────────────────────────────────────────────────────
const submitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
  timeSpentSeconds: z.number().int().min(0).max(900),
});

export const submitPracticeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitAnswerSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: q, error: qErr } = await supabase
      .from("questions")
      .select(
        "id,correct_answer,explanation,skill_category,skill_subcategory,distractor_a_explanation,distractor_b_explanation,distractor_c_explanation,distractor_d_explanation",
      )
      .eq("id", data.questionId)
      .maybeSingle();
    if (qErr || !q) throw new Error("Question not found");

    const isCorrect = data.selectedAnswer ? data.selectedAnswer === q.correct_answer : false;

    const { error: insErr } = await supabase.from("student_responses").insert({
      student_id: userId,
      session_id: data.sessionId,
      question_id: data.questionId,
      selected_answer: data.selectedAnswer,
      is_correct: isCorrect,
      time_spent_seconds: data.timeSpentSeconds,
    });
    if (insErr) throw new Error(insErr.message);

    await recordSkillAttempt(supabase, userId, q.skill_category, q.skill_subcategory, isCorrect);
    await updateReviewSchedule(supabase, userId, q.skill_category, q.skill_subcategory, isCorrect);

    const distractorKey = data.selectedAnswer
      ? (`distractor_${data.selectedAnswer.toLowerCase()}_explanation` as const)
      : null;
    const distractorNote = distractorKey
      ? (q as unknown as Record<string, string | null>)[distractorKey]
      : null;

    return {
      isCorrect,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      distractorNote: distractorNote ?? null,
    };
  });

// ─────────────────────────────────────────────────────────────────
// End practice session — write summary
// ─────────────────────────────────────────────────────────────────
const endSchema = z.object({ sessionId: z.string().uuid() });

export const endPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => endSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: resp } = await supabase
      .from("student_responses")
      .select("is_correct,question_id")
      .eq("session_id", data.sessionId);
    const total = resp?.length ?? 0;
    const correct = (resp ?? []).filter((r) => r.is_correct).length;

    await supabase
      .from("test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_questions: total,
        correct_count: correct,
      })
      .eq("id", data.sessionId)
      .eq("student_id", userId);

    return { total, correct };
  });

// ─────────────────────────────────────────────────────────────────
// List available skill categories for the practice picker
// ─────────────────────────────────────────────────────────────────
export const listSkillCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("questions")
      .select("section,skill_category")
      .eq("is_active", true);
    const seen = new Set<string>();
    const out: Array<{ section: string; category: string }> = [];
    for (const r of data ?? []) {
      const key = `${r.section}::${r.skill_category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ section: r.section, category: r.skill_category });
    }
    return out.sort(
      (a, b) => a.section.localeCompare(b.section) || a.category.localeCompare(b.category),
    );
  });

// ─────────────────────────────────────────────────────────────────
// Skills due for spaced-repetition review right now (dashboard card)
// ─────────────────────────────────────────────────────────────────
export const getDueReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const due = await getDueSkills(supabase, userId);
    return {
      count: due.length,
      skills: due.map((d) => ({
        category: d.skill_category,
        subcategory: d.skill_subcategory || null,
      })),
    };
  });
