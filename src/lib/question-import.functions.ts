import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  validateImportQuestion,
  type ImportQuestion,
  type ImportIssue,
} from "./question-import";

export const importQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questions: ImportQuestion[]; replace?: boolean }) => ({
    questions: Array.isArray(input?.questions) ? input.questions : [],
    replace: Boolean(input?.replace),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.role !== "admin") throw new Error("Forbidden: admin only");

    if (data.questions.length === 0) throw new Error("No questions provided");
    if (data.questions.length > 2000) throw new Error("Too many questions in one upload (max 2000)");

    const issues: ImportIssue[] = [];
    const rows = [];

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i]!;
      const problem = validateImportQuestion(q);
      if (problem) {
        issues.push({ index: i, problem });
        continue;
      }
      rows.push({
        section: q.section,
        skill_category: q.skill_category.trim(),
        skill_subcategory: q.skill_subcategory?.trim() || null,
        difficulty: Number(q.difficulty),
        module_type: q.module_type?.trim() || "standard",
        question_text: q.question_text,
        answer_a: q.answer_a,
        answer_b: q.answer_b,
        answer_c: q.answer_c,
        answer_d: q.answer_d,
        correct_answer: q.correct_answer.toString().trim().toUpperCase(),
        explanation: q.explanation ?? null,
        distractor_a_explanation: q.distractor_a_explanation ?? null,
        distractor_b_explanation: q.distractor_b_explanation ?? null,
        distractor_c_explanation: q.distractor_c_explanation ?? null,
        distractor_d_explanation: q.distractor_d_explanation ?? null,
        is_diagnostic: q.is_diagnostic ?? true,
        is_active: true,
      });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Duplicate detection: compare normalized question text against every
    // question ever stored (active or retired) and within this upload.
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const existing = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabaseAdmin
        .from("questions")
        .select("question_text")
        .range(from, from + 999);
      if (error) throw new Error(`Duplicate check failed: ${error.message}`);
      for (const r of page ?? []) existing.add(norm(r.question_text));
      if (!page || page.length < 1000) break;
    }
    let duplicates = 0;
    const freshRows = rows.filter((r) => {
      const key = norm(r.question_text);
      if (existing.has(key)) {
        duplicates++;
        return false;
      }
      existing.add(key);
      return true;
    });
    rows.length = 0;
    rows.push(...freshRows);

    if (rows.length === 0) {
      return { inserted: 0, retired: 0, duplicates, rejected: issues.length, issues: issues.slice(0, 50) };
    }

    let retired = 0;
    if (data.replace) {
      const { data: retiredRows, error: retireErr } = await supabaseAdmin
        .from("questions")
        .update({ is_active: false })
        .eq("is_active", true)
        .select("id");
      if (retireErr) throw new Error(`Retire failed: ${retireErr.message}`);
      retired = retiredRows?.length ?? 0;
    }

    // Insert in chunks to stay well within request limits.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabaseAdmin.from("questions").insert(chunk);
      if (error) throw new Error(`Insert failed at row ${i}: ${error.message}`);
      inserted += chunk.length;
    }

    return { inserted, retired, duplicates, rejected: issues.length, issues: issues.slice(0, 50) };
  });
