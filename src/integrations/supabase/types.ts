export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_tracking: {
        Row: {
          ai_minutes_used: number
          id: string
          month_year: string
          student_id: string
        }
        Insert: {
          ai_minutes_used?: number
          id?: string
          month_year: string
          student_id: string
        }
        Update: {
          ai_minutes_used?: number
          id?: string
          month_year?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_targets: {
        Row: {
          average_sat: number | null
          college_name: string
          created_at: string
          id: string
          priority: string | null
          sat_25th: number | null
          sat_75th: number | null
          student_id: string
        }
        Insert: {
          average_sat?: number | null
          college_name: string
          created_at?: string
          id?: string
          priority?: string | null
          sat_25th?: number | null
          sat_75th?: number | null
          student_id: string
        }
        Update: {
          average_sat?: number | null
          college_name?: string
          created_at?: string
          id?: string
          priority?: string | null
          sat_25th?: number | null
          sat_75th?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_patterns: {
        Row: {
          generated_at: string
          id: string
          pattern_summary: string | null
          student_id: string
          study_recommendations: string | null
          top_patterns: Json | null
        }
        Insert: {
          generated_at?: string
          id?: string
          pattern_summary?: string | null
          student_id: string
          study_recommendations?: string | null
          top_patterns?: Json | null
        }
        Update: {
          generated_at?: string
          id?: string
          pattern_summary?: string | null
          student_id?: string
          study_recommendations?: string | null
          top_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "error_patterns_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_reports: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          parent_email: string
          parent_name: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          parent_email: string
          parent_name?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          parent_email?: string
          parent_name?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_type: Database["public"]["Enums"]["access_tier"]
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["app_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          target_test_date: string | null
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["access_tier"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          target_test_date?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_tier"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          target_test_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer_a: string
          answer_b: string
          answer_c: string
          answer_d: string
          correct_answer: string
          created_at: string
          difficulty: number
          distractor_a_explanation: string | null
          distractor_b_explanation: string | null
          distractor_c_explanation: string | null
          distractor_d_explanation: string | null
          explanation: string | null
          id: string
          is_active: boolean
          is_diagnostic: boolean
          module_type: string
          question_text: string
          section: string
          skill_category: string
          skill_subcategory: string | null
        }
        Insert: {
          answer_a: string
          answer_b: string
          answer_c: string
          answer_d: string
          correct_answer: string
          created_at?: string
          difficulty: number
          distractor_a_explanation?: string | null
          distractor_b_explanation?: string | null
          distractor_c_explanation?: string | null
          distractor_d_explanation?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_diagnostic?: boolean
          module_type?: string
          question_text: string
          section: string
          skill_category: string
          skill_subcategory?: string | null
        }
        Update: {
          answer_a?: string
          answer_b?: string
          answer_c?: string
          answer_d?: string
          correct_answer?: string
          created_at?: string
          difficulty?: number
          distractor_a_explanation?: string | null
          distractor_b_explanation?: string | null
          distractor_c_explanation?: string | null
          distractor_d_explanation?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_diagnostic?: boolean
          module_type?: string
          question_text?: string
          section?: string
          skill_category?: string
          skill_subcategory?: string | null
        }
        Relationships: []
      }
      review_schedule: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review_date: string
          question_id: string
          repetitions: number
          skill_category: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id: string
          repetitions?: number
          skill_category?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id?: string
          repetitions?: number
          skill_category?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_schedule_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_schedule_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_projections: {
        Row: {
          ai_notes: string | null
          created_at: string
          id: string
          projected_math: number | null
          projected_reading_writing: number | null
          projected_total: number | null
          projection_date: string
          student_id: string
          trajectory_status: string | null
          weeks_to_test: number | null
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          id?: string
          projected_math?: number | null
          projected_reading_writing?: number | null
          projected_total?: number | null
          projection_date?: string
          student_id: string
          trajectory_status?: string | null
          weeks_to_test?: number | null
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          id?: string
          projected_math?: number | null
          projected_reading_writing?: number | null
          projected_total?: number | null
          projection_date?: string
          student_id?: string
          trajectory_status?: string | null
          weeks_to_test?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "score_projections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_performance: {
        Row: {
          correct_count: number
          id: string
          last_updated: string
          skill_category: string
          skill_subcategory: string | null
          student_id: string
          total_attempts: number
        }
        Insert: {
          correct_count?: number
          id?: string
          last_updated?: string
          skill_category: string
          skill_subcategory?: string | null
          student_id: string
          total_attempts?: number
        }
        Update: {
          correct_count?: number
          id?: string
          last_updated?: string
          skill_category?: string
          skill_subcategory?: string | null
          student_id?: string
          total_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_performance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_responses: {
        Row: {
          ai_explanation_requested: boolean
          ai_explanation_text: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_answer: string | null
          session_id: string | null
          student_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          ai_explanation_requested?: boolean
          ai_explanation_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_answer?: string | null
          session_id?: string | null
          student_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          ai_explanation_requested?: boolean
          ai_explanation_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_answer?: string | null
          session_id?: string | null
          student_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number | null
          estimated_score: number | null
          id: string
          math_correct: number | null
          module_1_score: number | null
          module_1_total: number | null
          module_2_difficulty: string | null
          reading_writing_correct: number | null
          session_type: string
          started_at: string
          status: string
          student_id: string
          total_questions: number | null
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number | null
          estimated_score?: number | null
          id?: string
          math_correct?: number | null
          module_1_score?: number | null
          module_1_total?: number | null
          module_2_difficulty?: string | null
          reading_writing_correct?: number | null
          session_type: string
          started_at?: string
          status?: string
          student_id: string
          total_questions?: number | null
        }
        Update: {
          completed_at?: string | null
          correct_count?: number | null
          estimated_score?: number | null
          id?: string
          math_correct?: number | null
          module_1_score?: number | null
          module_1_total?: number | null
          module_2_difficulty?: string | null
          reading_writing_correct?: number | null
          session_type?: string
          started_at?: string
          status?: string
          student_id?: string
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      access_tier: "starter" | "student" | "pro" | "founding_client"
      app_role: "student" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_tier: ["starter", "student", "pro", "founding_client"],
      app_role: ["student", "admin"],
    },
  },
} as const
