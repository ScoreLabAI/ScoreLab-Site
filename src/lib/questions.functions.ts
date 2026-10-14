import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];

export const seedQuestionBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { replace?: boolean } | undefined) => ({
    replace: Boolean(input?.replace),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const {
      SECTIONS,
      SEED_SYSTEM_PROMPT,
      buildBatchPrompt,
      extractJson,
      callAnthropic,
      validateQuestion,
    } = await import("./questions.server");
    type AIQuestion = import("./questions.server").AIQuestion;

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      throw new Error("Forbidden: admin only");
    }

    const QUESTIONS_PER_CELL = 2;
    const inserted: QuestionInsert[] = [];
    const errors: string[] = [];
    let rejected = 0;

    for (const sec of SECTIONS) {
      for (const skill of sec.skills) {
        for (const spec of skill.specs) {
          for (const diff of [1, 2, 3] as const) {
            try {
              const prompt = buildBatchPrompt({
                section: sec.section,
                category: skill.category,
                spec,
                difficulty: diff,
                count: QUESTIONS_PER_CELL,
              });

              const response = await callAnthropic({
                system: SEED_SYSTEM_PROMPT,
                messages: [{ role: "user", content: prompt }],
                temperature: 1,
                maxTokens: 4000,
              });

              const parsed = extractJson(response) as { questions: AIQuestion[] };
              if (!Array.isArray(parsed.questions)) throw new Error("Missing questions array");

              for (const q of parsed.questions) {
                const problem = validateQuestion(q, sec.section);
                if (problem) {
                  rejected++;
                  errors.push(`${skill.category}/${spec.sub}/d${diff}: rejected (${problem})`);
                  continue;
                }
                inserted.push({
                  section: sec.section,
                  skill_category: skill.category,
                  skill_subcategory: spec.sub,
                  difficulty: diff,
                  module_type: "standard",
                  question_text: q.question_text,
                  answer_a: q.answer_a,
                  answer_b: q.answer_b,
                  answer_c: q.answer_c,
                  answer_d: q.answer_d,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation,
                  distractor_a_explanation: q.distractor_a_explanation,
                  distractor_b_explanation: q.distractor_b_explanation,
                  distractor_c_explanation: q.distractor_c_explanation,
                  distractor_d_explanation: q.distractor_d_explanation,
                  is_diagnostic: true,
                  is_active: true,
                });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              errors.push(`${skill.category}/${spec.sub}/d${diff}: ${msg}`);
            }
          }
        }
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Retire the old bank only once we have a fresh batch to replace it with.
    let retired = 0;
    if (data.replace && inserted.length > 0) {
      const { data: retiredRows, error: retireErr } = await supabaseAdmin
        .from("questions")
        .update({ is_active: false })
        .eq("is_active", true)
        .select("id");
      if (retireErr) throw new Error(`Retire failed: ${retireErr.message}`);
      retired = retiredRows?.length ?? 0;
    }

    if (inserted.length > 0) {
      const { error } = await supabaseAdmin.from("questions").insert(inserted);
      if (error) throw new Error(`Insert failed: ${error.message}`);
    }

    return { inserted: inserted.length, rejected, retired, errors };
  });
