import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const explainSchema = z.object({
  questionId: z.string().uuid(),
  studentAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
  followUp: z.string().max(500).nullable().optional(),
});

export const explainQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => explainSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { TUTOR_SYSTEM, callAnthropic } = await import("./tutor.server");

    const { data: q, error } = await supabase
      .from("questions")
      .select(
        "section,question_text,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation,skill_category,skill_subcategory,has_visual,visual_type,visual_data",
      )
      .eq("id", data.questionId)
      .maybeSingle();
    if (error || !q) throw new Error("Question not found");

    const choices = `A) ${q.answer_a}\nB) ${q.answer_b}\nC) ${q.answer_c}\nD) ${q.answer_d}`;
    // The student sees a rendered table/graph/figure alongside the question
    // text; give the model the same structured data it was rendered from
    // (not the SVG markup, which isn't meaningful as text) so it isn't
    // explaining a figure it can't actually see.
    const visualNote = q.has_visual
      ? `This question includes a ${q.visual_type} the student can see, described precisely by this data: ${JSON.stringify(q.visual_data)}`
      : "";
    const userMsg = [
      `SAT ${q.section === "math" ? "Math" : "Reading & Writing"} question (${q.skill_category}${q.skill_subcategory ? " — " + q.skill_subcategory : ""}):`,
      "",
      q.question_text,
      "",
      visualNote,
      "",
      choices,
      "",
      `Correct answer: ${q.correct_answer}`,
      data.studentAnswer
        ? `Student picked: ${data.studentAnswer}`
        : `Student skipped the question.`,
      q.explanation ? `Reference explanation: ${q.explanation}` : "",
      "",
      data.followUp
        ? `The student asks: "${data.followUp}". Address their question directly.`
        : `Explain how to arrive at the correct answer and, if the student picked wrong, why their choice was tempting.`,
    ]
      .filter(Boolean)
      .join("\n");

    const text = await callAnthropic({
      system: TUTOR_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
      temperature: 0.3,
      maxTokens: 800,
    });

    return { explanation: text };
  });
