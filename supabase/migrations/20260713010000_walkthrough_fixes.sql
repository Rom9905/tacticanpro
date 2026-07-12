-- ============================================================
-- Walkthrough fixes:
-- 1. More Hebrew-value CHECK constraints that block saves
--    (decision analysis, program reviews/outcomes)
-- 2. Admin RLS — admin panel could only see/update its own profile
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Decision analysis writes Hebrew values ('מוצלח'/'ניטרלי'/'בעייתי', 'נמוך'/'בינוני'/'גבוה')
ALTER TABLE public.match_decision_summaries DROP CONSTRAINT IF EXISTS match_decision_summaries_outcome_check;
ALTER TABLE public.match_decision_summaries DROP CONSTRAINT IF EXISTS match_decision_summaries_severity_check;
ALTER TABLE public.player_decision_profiles DROP CONSTRAINT IF EXISTS player_decision_profiles_confidence_level_check;

-- Program review dialog writes Hebrew values ('השתפר', 'יעיל', 'יעיל חלקית'…)
ALTER TABLE public.training_program_reviews DROP CONSTRAINT IF EXISTS training_program_reviews_coach_evaluation_check;
ALTER TABLE public.training_program_reviews DROP CONSTRAINT IF EXISTS training_program_reviews_ai_impact_level_check;
ALTER TABLE public.program_outcomes DROP CONSTRAINT IF EXISTS program_outcomes_outcome_status_check;
ALTER TABLE public.program_outcomes DROP CONSTRAINT IF EXISTS program_outcomes_coach_evaluation_check;

-- ────────────────────────────────────────────────────────────
-- Admin access: user management + analytics pages need to read
-- all profiles / analytics events and update access status.
-- SECURITY DEFINER helper avoids recursive RLS on profiles.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON public.profiles FOR SELECT USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles"
      ON public.profiles FOR UPDATE USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_events' AND policyname = 'Admins can view all analytics'
  ) THEN
    CREATE POLICY "Admins can view all analytics"
      ON public.analytics_events FOR SELECT USING (public.is_admin());
  END IF;
END $$;
