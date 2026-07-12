-- ============================================================
-- Fix broken features: missing columns, over-strict CHECK
-- constraints (Hebrew UI values vs English constraints),
-- rating precision, and missing RLS policies.
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. MISSING COLUMNS referenced by the app code
-- ────────────────────────────────────────────────────────────

-- PlayerForm / PlayerCard / lineup engines read+write players.status
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS status TEXT;

-- PlayerProfile reads training_programs.drills ([{drill_id}])
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS drills JSONB DEFAULT '[]';

-- TrainingProgramModal reads/writes per-topic scores on evaluations
ALTER TABLE public.training_session_evaluations ADD COLUMN IF NOT EXISTS topic_scores JSONB DEFAULT '{}';

-- ────────────────────────────────────────────────────────────
-- 2. RATING PRECISION — UI allows half-point ratings (7.5)
--    but the column was INTEGER, so those inserts failed.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.training_session_evaluations
  DROP CONSTRAINT IF EXISTS training_session_evaluations_rating_check;
ALTER TABLE public.training_session_evaluations
  ALTER COLUMN rating TYPE NUMERIC USING rating::numeric;
ALTER TABLE public.training_session_evaluations
  ADD CONSTRAINT training_session_evaluations_rating_check CHECK (rating >= 1 AND rating <= 10);

-- ────────────────────────────────────────────────────────────
-- 3. DROP over-strict value CHECK constraints.
--    The UI writes Hebrew values ('ליגה', 'מאוזן', 'זמין', 'ימין',
--    'general'/'opponent' prep types, action_type 'team', …) that
--    violate the original English-only constraints, which made
--    every such save silently fail.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_context_check;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_location_check;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_importance_check;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_playing_style_check;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_age_group_check;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_formation_check;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_squad_status_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_availability_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_dominant_foot_check;

-- satisfaction: UI defaults to 0 / unset; allow NULL or 0-5
ALTER TABLE public.professional_summaries DROP CONSTRAINT IF EXISTS professional_summaries_satisfaction_check;
ALTER TABLE public.professional_summaries
  ADD CONSTRAINT professional_summaries_satisfaction_check
  CHECK (satisfaction IS NULL OR (satisfaction BETWEEN 0 AND 5));

ALTER TABLE public.game_preps DROP CONSTRAINT IF EXISTS game_preps_prep_type_check;
ALTER TABLE public.game_preps DROP CONSTRAINT IF EXISTS game_preps_opponent_strength_level_check;

ALTER TABLE public.training_actions DROP CONSTRAINT IF EXISTS training_actions_action_type_check;

ALTER TABLE public.key_match_situations DROP CONSTRAINT IF EXISTS key_match_situations_situation_category_check;

ALTER TABLE public.tactical_goals DROP CONSTRAINT IF EXISTS tactical_goals_category_check;
ALTER TABLE public.tactical_goals DROP CONSTRAINT IF EXISTS tactical_goals_source_check;

ALTER TABLE public.tactical_boards DROP CONSTRAINT IF EXISTS tactical_boards_category_check;
ALTER TABLE public.tactical_boards DROP CONSTRAINT IF EXISTS tactical_boards_template_type_check;

ALTER TABLE public.drill_library DROP CONSTRAINT IF EXISTS drill_library_category_check;
ALTER TABLE public.drill_library DROP CONSTRAINT IF EXISTS drill_library_age_level_check;
ALTER TABLE public.drill_library DROP CONSTRAINT IF EXISTS drill_library_difficulty_check;

-- ────────────────────────────────────────────────────────────
-- 4. RLS — ensure every user table has SELECT/INSERT/UPDATE/DELETE
--    policies for authenticated users on their own rows.
--    Creates a policy only if no policy exists for that command.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  action TEXT;
  polname TEXT;
  has_policy BOOLEAN;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'teams', 'players', 'game_schedules', 'match_analyses',
      'professional_summaries', 'tactical_goals', 'key_match_situations',
      'training_programs', 'training_session_evaluations', 'training_actions',
      'tactical_boards', 'lineup_templates', 'game_preps', 'conversations',
      'player_decision_profiles', 'match_decision_summaries',
      'training_program_reviews', 'program_outcomes', 'analytics_events',
      'drill_library', 'player_attribute_history'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    FOREACH action IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      SELECT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = tbl
          AND (p.cmd = action OR p.cmd = 'ALL')
      ) INTO has_policy;

      IF NOT has_policy THEN
        polname := format('Own rows %s on %s', lower(action), tbl);
        IF action = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id);',
            polname, tbl
          );
        ELSIF action = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
            polname, tbl
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR %s USING (auth.uid() = user_id);',
            polname, tbl, action
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- profiles: allow a user to insert their own profile row (fallback if the
-- auth trigger didn't fire) in addition to existing select/update policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'ALL')
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
