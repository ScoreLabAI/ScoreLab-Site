
-- Enums
CREATE TYPE public.app_role AS ENUM ('student', 'admin');
CREATE TYPE public.access_tier AS ENUM ('starter', 'student', 'pro', 'founding_client');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'student',
  access_type access_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  target_test_date DATE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin');
$$;

-- profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('math','reading_writing')),
  skill_category TEXT NOT NULL,
  skill_subcategory TEXT,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  module_type TEXT NOT NULL DEFAULT 'standard' CHECK (module_type IN ('standard','easy_module','hard_module')),
  question_text TEXT NOT NULL,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT NOT NULL,
  answer_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation TEXT,
  distractor_a_explanation TEXT,
  distractor_b_explanation TEXT,
  distractor_c_explanation TEXT,
  distractor_d_explanation TEXT,
  is_diagnostic BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read questions" ON public.questions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL USING (public.is_admin(auth.uid()));

-- test_sessions
CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('diagnostic','practice','full_test')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  module_1_score INTEGER,
  module_1_total INTEGER,
  module_2_difficulty TEXT CHECK (module_2_difficulty IN ('easy','hard')),
  total_questions INTEGER,
  correct_count INTEGER,
  math_correct INTEGER,
  reading_writing_correct INTEGER,
  estimated_score INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sessions select" ON public.test_sessions FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own sessions insert" ON public.test_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Own sessions update" ON public.test_sessions FOR UPDATE USING (auth.uid() = student_id);

-- student_responses
CREATE TABLE public.student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  selected_answer TEXT CHECK (selected_answer IN ('A','B','C','D')),
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  ai_explanation_requested BOOLEAN NOT NULL DEFAULT false,
  ai_explanation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own responses select" ON public.student_responses FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own responses insert" ON public.student_responses FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Own responses update" ON public.student_responses FOR UPDATE USING (auth.uid() = student_id);

-- skill_performance
CREATE TABLE public.skill_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL,
  skill_subcategory TEXT,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, skill_category, skill_subcategory)
);
ALTER TABLE public.skill_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own skills select" ON public.skill_performance FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own skills insert" ON public.skill_performance FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Own skills update" ON public.skill_performance FOR UPDATE USING (auth.uid() = student_id);

-- review_schedule
CREATE TABLE public.review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  skill_category TEXT,
  ease_factor FLOAT NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date DATE NOT NULL DEFAULT (CURRENT_DATE + 1),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id)
);
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own review select" ON public.review_schedule FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own review insert" ON public.review_schedule FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Own review update" ON public.review_schedule FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Own review delete" ON public.review_schedule FOR DELETE USING (auth.uid() = student_id);

-- college_targets
CREATE TABLE public.college_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_name TEXT NOT NULL,
  average_sat INTEGER,
  sat_25th INTEGER,
  sat_75th INTEGER,
  priority TEXT CHECK (priority IN ('reach','target','safety')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.college_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own colleges all" ON public.college_targets FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admin colleges read" ON public.college_targets FOR SELECT USING (public.is_admin(auth.uid()));

-- score_projections
CREATE TABLE public.score_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  projected_total INTEGER,
  projected_math INTEGER,
  projected_reading_writing INTEGER,
  weeks_to_test INTEGER,
  trajectory_status TEXT CHECK (trajectory_status IN ('on_track','needs_more_practice','at_risk')),
  ai_notes TEXT,
  projection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.score_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own projections select" ON public.score_projections FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own projections insert" ON public.score_projections FOR INSERT WITH CHECK (auth.uid() = student_id);

-- error_patterns
CREATE TABLE public.error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern_summary TEXT,
  top_patterns JSONB,
  study_recommendations TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own patterns select" ON public.error_patterns FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own patterns insert" ON public.error_patterns FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ai_usage_tracking
CREATE TABLE public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  ai_minutes_used FLOAT NOT NULL DEFAULT 0,
  UNIQUE (student_id, month_year)
);
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own usage select" ON public.ai_usage_tracking FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Own usage insert" ON public.ai_usage_tracking FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Own usage update" ON public.ai_usage_tracking FOR UPDATE USING (auth.uid() = student_id);

-- parent_reports
CREATE TABLE public.parent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  parent_name TEXT,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reports all" ON public.parent_reports FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
