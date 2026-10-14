import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProgressData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Sessions (last 30)
    const { data: sessions } = await supabase
      .from("test_sessions")
      .select("id,session_type,status,started_at,completed_at,total_questions,correct_count,estimated_score,math_correct,reading_writing_correct")
      .eq("student_id", userId)
      .order("started_at", { ascending: false })
      .limit(30);

    // Score projections (timeseries)
    const { data: projections } = await supabase
      .from("score_projections")
      .select("projected_total,projected_math,projected_reading_writing,created_at,trajectory_status")
      .eq("student_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);

    // Skill performance
    const { data: skills } = await supabase
      .from("skill_performance")
      .select("skill_category,skill_subcategory,correct_count,total_attempts,last_updated")
      .eq("student_id", userId);

    // Recent responses for activity heat + time stats
    const { data: responses } = await supabase
      .from("student_responses")
      .select("is_correct,time_spent_seconds,created_at")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    // Streak: count distinct days back from today with at least one response
    const dayKey = (d: string) => new Date(d).toISOString().slice(0, 10);
    const dayset = new Set((responses ?? []).map(r => dayKey(r.created_at)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (dayset.has(k)) streak++;
      else if (i > 0) break;
    }

    // Daily activity for last 14 days
    const activity: Array<{ date: string; answered: number; correct: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const dayResp = (responses ?? []).filter(r => dayKey(r.created_at) === k);
      activity.push({
        date: k,
        answered: dayResp.length,
        correct: dayResp.filter(r => r.is_correct).length,
      });
    }

    const totalAnswered = responses?.length ?? 0;
    const totalCorrect = (responses ?? []).filter(r => r.is_correct).length;
    const avgTime = totalAnswered
      ? Math.round((responses ?? []).reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0) / totalAnswered)
      : 0;

    const latestScore = projections && projections.length > 0 ? projections[projections.length - 1] : null;

    return {
      streak,
      totals: { answered: totalAnswered, correct: totalCorrect, avgTimeSeconds: avgTime },
      latestScore,
      projections: projections ?? [],
      sessions: sessions ?? [],
      skills: (skills ?? []).map(s => ({
        category: s.skill_category,
        subcategory: s.skill_subcategory,
        correct: s.correct_count,
        total: s.total_attempts,
        accuracy: s.total_attempts ? s.correct_count / s.total_attempts : 0,
        lastUpdated: s.last_updated,
      })),
      activity,
    };
  });
