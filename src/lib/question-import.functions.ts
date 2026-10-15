import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ImportQuestion } from "./question-import";

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

    const { runQuestionImport } = await import("./question-import.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runQuestionImport(supabaseAdmin, data.questions, data.replace);
  });
