import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RW_M1_COUNT, RW_M2_COUNT, MATH_M1_COUNT, MATH_M2_COUNT, pickQuestions } from "./diagnostic.server";
import { sectionScore, pickModule2Difficulty, type ModuleDifficulty } from "@/lib/sat-scoring";

// Diagnostic structure — matches real digital SAT:
// Reading & Writing: Module 1 (27 questions, mixed) → Module 2 (27 q, easy or hard)
// Math: Module 1 (22 questions) → Module 2 (22 q, easy or hard)


// ─────────────────────────────────────────────────────────────────
// Start a diagnostic session
// ─────────────────────────────────────────────────────────────────
export const startDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Mark any existing in-progress diagnostic as abandoned
    await supabase
      .from("test_sessions")
      .update({ status: "abandoned" })
      .eq("student_id", userId)
      .eq("session_type", "diagnostic")
      .eq("status", "in_progress");

    const { data: session, error } = await supabase
      .from("test_sessions")
      .insert({
        student_id: userId,
        session_type: "diagnostic",
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error || !session) throw new Error(error?.message || "Failed to start session");

    // Pick module 1 questions for both sections
    const rwM1 = await pickQuestions(supabase, "reading_writing", RW_M1_COUNT, "mixed");
    const mathM1 = await pickQuestions(supabase, "math", MATH_M1_COUNT, "mixed");

    return {
      sessionId: session.id,
      questions: [...rwM1, ...mathM1],
      module1Counts: { rw: rwM1.length, math: mathM1.length },
    };
  });

// ─────────────────────────────────────────────────────────────────
// Submit module 1 answers, get module 2 questions adapted to performance
// ─────────────────────────────────────────────────────────────────
const submitModule1Schema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
    timeSpentSeconds: z.number().int().min(0).max(600),
  })),
});

export const submitModule1 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitModule1Schema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Fetch the questions to grade
    const qIds = data.answers.map(a => a.questionId);
    const { data: questions } = await supabase
      .from("questions")
      .select("id,section,correct_answer,skill_category,skill_subcategory")
      .in("id", qIds);
    if (!questions) throw new Error("Failed to load questions");

    const qMap = new Map(questions.map(q => [q.id, q]));

    // Insert responses
    const responseRows = data.answers.map(a => {
      const q = qMap.get(a.questionId);
      const isCorrect = q && a.selectedAnswer ? a.selectedAnswer === q.correct_answer : false;
      return {
        student_id: userId,
        session_id: data.sessionId,
        question_id: a.questionId,
        selected_answer: a.selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: a.timeSpentSeconds,
      };
    });
    const { error: insErr } = await supabase.from("student_responses").insert(responseRows);
    if (insErr) throw new Error(insErr.message);

    // Tally module 1 correct counts per section
    let rwCorrect = 0;
    let mathCorrect = 0;
    for (const a of data.answers) {
      const q = qMap.get(a.questionId);
      if (!q) continue;
      const correct = a.selectedAnswer === q.correct_answer;
      if (q.section === "reading_writing" && correct) rwCorrect++;
      if (q.section === "math" && correct) mathCorrect++;
    }

    const rwM2Difficulty = rwCorrect >= 8 ? "hard" : "easy";
    const mathM2Difficulty = mathCorrect >= 6 ? "hard" : "easy";

    // Module 2 question selection — bias toward the targeted difficulty
    const rwM2 = await pickQuestions(supabase, "reading_writing", RW_M2_COUNT, rwM2Difficulty);
    const mathM2 = await pickQuestions(supabase, "math", MATH_M2_COUNT, mathM2Difficulty);

    // Save module 1 progress
    await supabase
      .from("test_sessions")
      .update({
        module_1_score: rwCorrect + mathCorrect,
        module_1_total: data.answers.length,
        module_2_difficulty: `rw:${rwM2Difficulty},math:${mathM2Difficulty}`,
      })
      .eq("id", data.sessionId);

    return {
      questions: [...rwM2, ...mathM2],
      rwM2Difficulty,
      mathM2Difficulty,
    };
  });

// ─────────────────────────────────────────────────────────────────
// Complete the diagnostic — submit module 2, compute final score
// ─────────────────────────────────────────────────────────────────
const completeDiagnosticSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
    timeSpentSeconds: z.number().int().min(0).max(600),
  })),
  rwM2Difficulty: z.enum(["easy", "hard"]),
  mathM2Difficulty: z.enum(["easy", "hard"]),
});

export const completeDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeDiagnosticSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const qIds = data.answers.map(a => a.questionId);
    const { data: questions } = await supabase
      .from("questions")
      .select("id,section,correct_answer,skill_category,skill_subcategory")
      .in("id", qIds);
    if (!questions) throw new Error("Failed to load questions");
    const qMap = new Map(questions.map(q => [q.id, q]));

    const responseRows = data.answers.map(a => {
      const q = qMap.get(a.questionId);
      const isCorrect = q && a.selectedAnswer ? a.selectedAnswer === q.correct_answer : false;
      return {
        student_id: userId,
        session_id: data.sessionId,
        question_id: a.questionId,
        selected_answer: a.selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: a.timeSpentSeconds,
      };
    });
    await supabase.from("student_responses").insert(responseRows);

    // Aggregate module 2 + load module 1 responses to compute total per section
    const { data: allResponses } = await supabase
      .from("student_responses")
      .select("question_id,is_correct")
      .eq("session_id", data.sessionId);

    const allQIds = (allResponses ?? []).map(r => r.question_id);
    const { data: allQs } = await supabase
      .from("questions")
      .select("id,section,skill_category,skill_subcategory")
      .in("id", allQIds);
    const allQMap = new Map((allQs ?? []).map(q => [q.id, q]));

    let rwCorrect = 0, mathCorrect = 0;
    const skillTally = new Map<string, { correct: number; total: number; category: string; sub: string | null }>();
    for (const r of allResponses ?? []) {
      const q = allQMap.get(r.question_id);
      if (!q) continue;
      if (q.section === "reading_writing" && r.is_correct) rwCorrect++;
      if (q.section === "math" && r.is_correct) mathCorrect++;

      const key = `${q.skill_category}::${q.skill_subcategory ?? ""}`;
      const cur = skillTally.get(key) ?? { correct: 0, total: 0, category: q.skill_category, sub: q.skill_subcategory };
      cur.total++;
      if (r.is_correct) cur.correct++;
      skillTally.set(key, cur);
    }

    const rwScore = sectionScore("reading_writing", rwCorrect, data.rwM2Difficulty as ModuleDifficulty);
    const mathScore = sectionScore("math", mathCorrect, data.mathM2Difficulty as ModuleDifficulty);
    const total = rwScore + mathScore;

    // Update session
    await supabase
      .from("test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_questions: allResponses?.length ?? 0,
        correct_count: rwCorrect + mathCorrect,
        math_correct: mathCorrect,
        reading_writing_correct: rwCorrect,
        estimated_score: total,
      })
      .eq("id", data.sessionId);

    // Upsert skill_performance
    for (const [, v] of skillTally) {
      const { data: existing } = await supabase
        .from("skill_performance")
        .select("id,correct_count,total_attempts")
        .eq("student_id", userId)
        .eq("skill_category", v.category)
        .eq("skill_subcategory", v.sub ?? "")
        .maybeSingle();
      if (existing) {
        await supabase.from("skill_performance").update({
          correct_count: existing.correct_count + v.correct,
          total_attempts: existing.total_attempts + v.total,
          last_updated: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("skill_performance").insert({
          student_id: userId,
          skill_category: v.category,
          skill_subcategory: v.sub,
          correct_count: v.correct,
          total_attempts: v.total,
        });
      }
    }

    // Baseline projection
    await supabase.from("score_projections").insert({
      student_id: userId,
      projected_total: total,
      projected_math: mathScore,
      projected_reading_writing: rwScore,
      trajectory_status: "baseline",
      ai_notes: `Baseline diagnostic on ${new Date().toLocaleDateString()}.`,
    });

    return {
      total,
      math: mathScore,
      readingWriting: rwScore,
      rwCorrect,
      mathCorrect,
      skills: Array.from(skillTally.values()),
    };
  });

// ─────────────────────────────────────────────────────────────────
// Fetch full diagnostic results for the results page
// ─────────────────────────────────────────────────────────────────
const getResultsSchema = z.object({ sessionId: z.string().uuid() });

export const getDiagnosticResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getResultsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: session, error: sErr } = await supabase
      .from("test_sessions")
      .select("id,student_id,session_type,status,started_at,completed_at,total_questions,correct_count,math_correct,reading_writing_correct,estimated_score,module_2_difficulty")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found");
    if (session.student_id !== userId) throw new Error("Not authorized");

    const { data: responses } = await supabase
      .from("student_responses")
      .select("id,question_id,selected_answer,is_correct,time_spent_seconds,created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const qIds = (responses ?? []).map(r => r.question_id);
    const { data: questions } = qIds.length
      ? await supabase
          .from("questions")
          .select("id,section,skill_category,skill_subcategory,difficulty,question_text,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation")
          .in("id", qIds)
      : { data: [] as any[] };
    const qMap = new Map((questions ?? []).map(q => [q.id, q]));

    // Tally per skill_category
    const catTally = new Map<string, { category: string; correct: number; total: number; section: string }>();
    let rwCorrect = 0, rwTotal = 0, mathCorrect = 0, mathTotal = 0;
    let totalTime = 0;
    for (const r of responses ?? []) {
      const q = qMap.get(r.question_id);
      if (!q) continue;
      totalTime += r.time_spent_seconds ?? 0;
      if (q.section === "reading_writing") { rwTotal++; if (r.is_correct) rwCorrect++; }
      if (q.section === "math") { mathTotal++; if (r.is_correct) mathCorrect++; }
      const cur = catTally.get(q.skill_category) ?? { category: q.skill_category, correct: 0, total: 0, section: q.section };
      cur.total++;
      if (r.is_correct) cur.correct++;
      catTally.set(q.skill_category, cur);
    }

    const reviewItems = (responses ?? []).map(r => {
      const q = qMap.get(r.question_id);
      return {
        responseId: r.id,
        questionId: r.question_id,
        section: q?.section ?? "",
        skillCategory: q?.skill_category ?? "",
        skillSubcategory: q?.skill_subcategory ?? null,
        difficulty: q?.difficulty ?? null,
        questionText: q?.question_text ?? "",
        choices: q ? { A: q.answer_a, B: q.answer_b, C: q.answer_c, D: q.answer_d } : { A: "", B: "", C: "", D: "" },
        correctAnswer: q?.correct_answer ?? null,
        selectedAnswer: r.selected_answer,
        isCorrect: r.is_correct,
        timeSpentSeconds: r.time_spent_seconds ?? 0,
        explanation: q?.explanation ?? null,
      };
    });

    return {
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        estimatedScore: session.estimated_score,
        rwCorrect: session.reading_writing_correct ?? rwCorrect,
        mathCorrect: session.math_correct ?? mathCorrect,
        totalQuestions: session.total_questions ?? (responses?.length ?? 0),
        moduleDifficulty: session.module_2_difficulty,
      },
      sectionTotals: { rwCorrect, rwTotal, mathCorrect, mathTotal, totalTimeSeconds: totalTime },
      skills: Array.from(catTally.values()),
      review: reviewItems,
    };
  });

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
