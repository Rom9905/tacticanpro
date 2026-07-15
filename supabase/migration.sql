-- ============================================================
-- TacticanPro — Supabase Migration Script
-- Full schema with RLS policies for multi-tenant isolation
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  plan TEXT CHECK (plan IN ('starter', 'pro', 'club')),
  access_status TEXT NOT NULL DEFAULT 'no_access' CHECK (access_status IN ('no_access', 'paid', 'manual_access', 'trial')),
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  setup_team_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
-- SET search_path is required (GoTrue runs with search_path=auth) and the
-- exception handler ensures a failure here can never block user creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT CHECK (age_group IN ('ילדים', 'נערים', 'נוער', 'בוגרים')),
  league TEXT,
  formation TEXT CHECK (formation IN ('4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-1-4-1')),
  playing_style TEXT CHECK (playing_style IN ('attacking', 'balanced', 'defensive', 'possession', 'counter')),
  tactical_focus TEXT,
  logo_url TEXT,
  game_style JSONB DEFAULT '{}',
  game_style_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_user_id ON public.teams(user_id);

-- ============================================================
-- 3. PLAYERS
-- ============================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER,
  photo_url TEXT,
  position TEXT NOT NULL,
  position_secondary TEXT,
  role TEXT,
  squad_status TEXT DEFAULT 'bench' CHECK (squad_status IN ('starter', 'bench', 'reserve', 'injured', 'loaned')),
  availability TEXT DEFAULT 'available' CHECK (availability IN ('available', 'injured', 'suspended', 'personal', 'national_team')),
  dominant_foot TEXT CHECK (dominant_foot IN ('right', 'left', 'both')),
  skill_ratings JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  coach_professional_notes TEXT,
  decision_profile JSONB DEFAULT '{}',
  professional_status TEXT,
  season_goals INTEGER DEFAULT 0,
  season_assists INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  match_history JSONB DEFAULT '[]',
  is_starter BOOLEAN DEFAULT false,
  lineup_position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_team_id ON public.players(team_id);
CREATE INDEX idx_players_user_id ON public.players(user_id);

-- ============================================================
-- 4. GAME SCHEDULES
-- ============================================================
CREATE TABLE public.game_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  game_date TIMESTAMPTZ NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('match', 'training', 'friendly', 'cup', 'league')),
  location TEXT CHECK (location IN ('בית', 'חוץ', 'ניטרלי')),
  venue TEXT,
  importance TEXT CHECK (importance IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  competition TEXT,
  notes TEXT,
  last_training_before TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_schedules_team_id ON public.game_schedules(team_id);
CREATE INDEX idx_game_schedules_date ON public.game_schedules(game_date);

-- ============================================================
-- 5. MATCH ANALYSES
-- ============================================================
CREATE TABLE public.match_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  summary_id UUID,
  opponent TEXT NOT NULL,
  date DATE NOT NULL,
  opponent_formation TEXT,
  opponent_attack_style TEXT,
  result JSONB,
  analysis_types TEXT[] DEFAULT '{}',
  analysis_mode TEXT,
  stats JSONB DEFAULT '{}',
  video_moments JSONB DEFAULT '[]',
  free_notes TEXT,
  key_phrases TEXT[] DEFAULT '{}',
  player_ratings JSONB DEFAULT '[]',
  game_plan JSONB DEFAULT '{}',
  phase_analysis JSONB DEFAULT '{}',
  insights JSONB DEFAULT '[]',
  recurring_patterns JSONB DEFAULT '[]',
  training_actions JSONB DEFAULT '[]',
  report JSONB DEFAULT '{}',
  deep_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_analyses_team_id ON public.match_analyses(team_id);
CREATE INDEX idx_match_analyses_date ON public.match_analyses(date);

-- ============================================================
-- 6. PROFESSIONAL SUMMARIES
-- ============================================================
CREATE TABLE public.professional_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('match', 'training')),
  event_date DATE NOT NULL,
  event_label TEXT,
  duration_minutes INTEGER,
  topic TEXT,
  tactical_topics TEXT[] DEFAULT '{}',
  what_worked TEXT,
  issues_found TEXT,
  tactical_insights TEXT,
  decisions_next TEXT,
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
  result_our INTEGER,
  result_opponent INTEGER,
  opponent_formation TEXT,
  opponent_attack_style TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professional_summaries_team_id ON public.professional_summaries(team_id);

-- ============================================================
-- 7. TACTICAL GOALS (Work Topics)
-- ============================================================
CREATE TABLE public.tactical_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('attacking', 'defending', 'transition', 'set_pieces', 'fitness', 'mentality', 'general')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'match', 'training', 'ai')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'paused')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  progress_pct INTEGER DEFAULT 0,
  progress_note TEXT,
  linked_topics TEXT[] DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 0,
  last_seen_date DATE,
  source_summaries UUID[] DEFAULT '{}',
  source_match_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tactical_goals_team_id ON public.tactical_goals(team_id);
CREATE INDEX idx_tactical_goals_status ON public.tactical_goals(status);

-- ============================================================
-- 8. KEY MATCH SITUATIONS
-- ============================================================
CREATE TABLE public.key_match_situations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  situation_name TEXT NOT NULL,
  situation_category TEXT NOT NULL CHECK (situation_category IN ('attacking', 'defending', 'transition', 'set_pieces', 'ניהול משחק', 'מעברי משחק', 'קטעים קבועים', 'בנייה', 'general')),
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'monitoring')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  deadline TIMESTAMPTZ,
  related_game_id UUID,
  source_match_id UUID,
  occurrence_count INTEGER DEFAULT 0,
  last_seen DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_key_match_situations_team_id ON public.key_match_situations(team_id);

-- ============================================================
-- 9. TRAINING PROGRAMS
-- ============================================================
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  focus_title TEXT NOT NULL,
  work_topics TEXT[] DEFAULT '{}',
  progress_percentage INTEGER DEFAULT 0,
  goal_statement TEXT,
  start_date DATE,
  end_date DATE,
  notes_for_coach TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_programs_team_id ON public.training_programs(team_id);
CREATE INDEX idx_training_programs_player_id ON public.training_programs(player_id);

-- ============================================================
-- 10. TRAINING SESSION EVALUATIONS
-- ============================================================
CREATE TABLE public.training_session_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.training_programs(id) ON DELETE SET NULL,
  training_event_id UUID,
  training_date DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  coach_note TEXT,
  focus_areas TEXT[] DEFAULT '{}',
  improvement_observed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_evaluations_player ON public.training_session_evaluations(player_id);
CREATE INDEX idx_training_evaluations_program ON public.training_session_evaluations(program_id);

-- ============================================================
-- 11. TRAINING ACTIONS
-- ============================================================
CREATE TABLE public.training_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('drill', 'talk', 'video', 'tactical_session', 'individual')),
  pattern_situation TEXT NOT NULL,
  pattern_category TEXT,
  pattern_count INTEGER,
  selected_players UUID[] DEFAULT '{}',
  scheduled_date DATE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  deadline TIMESTAMPTZ,
  related_game_id UUID,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_actions_team_id ON public.training_actions(team_id);

-- ============================================================
-- 12. TACTICAL BOARDS
-- ============================================================
CREATE TABLE public.tactical_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frames JSONB DEFAULT '[]',
  category TEXT CHECK (category IN ('attack', 'defense', 'transition', 'set_piece', 'general')),
  template_type TEXT CHECK (template_type IN ('formation', 'drill', 'play', 'analysis')),
  is_template BOOLEAN DEFAULT false,
  source_analysis_id UUID,
  source_situation_id UUID,
  linked_training_action_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tactical_boards_team_id ON public.tactical_boards(team_id);

-- ============================================================
-- 13. LINEUP TEMPLATES
-- ============================================================
CREATE TABLE public.lineup_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  formation TEXT NOT NULL,
  starters JSONB DEFAULT '[]',
  bench JSONB DEFAULT '[]',
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lineup_templates_team_id ON public.lineup_templates(team_id);

-- ============================================================
-- 14. GAME PREPS
-- ============================================================
CREATE TABLE public.game_preps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  prep_type TEXT NOT NULL CHECK (prep_type IN ('pre_match', 'halftime', 'post_match')),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  opponent_name TEXT,
  opponent_formation TEXT,
  opponent_attack_style TEXT,
  opponent_defense_style TEXT,
  opponent_strength_level TEXT CHECK (opponent_strength_level IN ('weak', 'equal', 'strong', 'much_stronger')),
  opponent_key_strength TEXT,
  opponent_key_weakness TEXT,
  opponent_dangerous_players TEXT,
  opponent_patterns TEXT,
  additional_notes TEXT,
  based_on_prep_id UUID REFERENCES public.game_preps(id) ON DELETE SET NULL,
  recommended_lineup UUID[] DEFAULT '{}',
  ai_analysis JSONB,
  times_used INTEGER DEFAULT 0,
  results_when_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_preps_team_id ON public.game_preps(team_id);

-- ============================================================
-- 15. CONVERSATIONS (Coach Assistant)
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);

-- ============================================================
-- 16. PLAYER DECISION PROFILES
-- ============================================================
CREATE TABLE public.player_decision_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  related_situations JSONB DEFAULT '[]',
  decision_tendencies JSONB DEFAULT '{}',
  behavioral_notes TEXT,
  confidence_level TEXT DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  data_reliability JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_decision_profiles_player ON public.player_decision_profiles(player_id);

-- ============================================================
-- 17. MATCH DECISION SUMMARIES
-- ============================================================
CREATE TABLE public.match_decision_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.match_analyses(id) ON DELETE SET NULL,
  situation_id UUID REFERENCES public.key_match_situations(id) ON DELETE SET NULL,
  involved_players UUID[] NOT NULL DEFAULT '{}',
  team_behavior TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('positive', 'negative', 'neutral')),
  coach_note TEXT,
  match_date DATE,
  opponent TEXT,
  match_context TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  what_happened TEXT,
  what_was_wrong TEXT,
  correct_alternative TEXT,
  training_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_decision_summaries_team ON public.match_decision_summaries(team_id);

-- ============================================================
-- 18. TRAINING PROGRAM REVIEWS
-- ============================================================
CREATE TABLE public.training_program_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  coach_evaluation TEXT NOT NULL CHECK (coach_evaluation IN ('excellent', 'good', 'partial', 'poor', 'no_change')),
  coach_summary_note TEXT,
  review_date DATE NOT NULL,
  ai_detected_changes TEXT,
  ai_affected_situations UUID[] DEFAULT '{}',
  ai_impact_level TEXT CHECK (ai_impact_level IN ('low', 'medium', 'high')),
  ai_data_reliability JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. PROGRAM OUTCOMES
-- ============================================================
CREATE TABLE public.program_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  outcome_status TEXT NOT NULL CHECK (outcome_status IN ('completed', 'partial', 'abandoned')),
  coach_evaluation TEXT NOT NULL CHECK (coach_evaluation IN ('excellent', 'good', 'partial', 'poor', 'no_change')),
  ai_evaluation_summary TEXT,
  completion_date DATE NOT NULL,
  review_id UUID REFERENCES public.training_program_reviews(id) ON DELETE SET NULL,
  program_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 20. DRILL LIBRARY
-- ============================================================
CREATE TABLE public.drill_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  primary_goal TEXT NOT NULL,
  weakness_tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('warmup', 'technical', 'tactical', 'physical', 'mental', 'cooldown', 'small_sided_game', 'set_piece')),
  position_fit TEXT[] DEFAULT '{}',
  age_level TEXT CHECK (age_level IN ('kids', 'juniors', 'youth', 'adults', 'all')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_min INTEGER NOT NULL,
  setup TEXT,
  instructions TEXT,
  sets_reps TEXT,
  coach_cues TEXT,
  common_mistakes TEXT,
  progression TEXT,
  regression TEXT,
  is_group_drill BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 21. ANALYTICS EVENTS
-- ============================================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: all tables that need user isolation
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'teams', 'players', 'game_schedules', 'match_analyses',
      'professional_summaries', 'tactical_goals', 'key_match_situations',
      'training_programs', 'training_session_evaluations', 'training_actions',
      'tactical_boards', 'lineup_templates', 'game_preps', 'conversations',
      'player_decision_profiles', 'match_decision_summaries',
      'training_program_reviews', 'program_outcomes', 'drill_library',
      'analytics_events'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- Profiles: user can only see/edit their own
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Generic policy template for all user_id-based tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'teams', 'players', 'game_schedules', 'match_analyses',
      'professional_summaries', 'tactical_goals', 'key_match_situations',
      'training_programs', 'training_session_evaluations', 'training_actions',
      'tactical_boards', 'lineup_templates', 'game_preps', 'conversations',
      'player_decision_profiles', 'match_decision_summaries',
      'training_program_reviews', 'program_outcomes', 'analytics_events'
    ])
  LOOP
    -- SELECT: user sees only their own rows
    EXECUTE format(
      'CREATE POLICY "User isolation select on %1$s" ON public.%1$s FOR SELECT USING (auth.uid() = user_id);',
      tbl
    );
    -- INSERT: user can only insert rows owned by them
    EXECUTE format(
      'CREATE POLICY "User isolation insert on %1$s" ON public.%1$s FOR INSERT WITH CHECK (auth.uid() = user_id);',
      tbl
    );
    -- UPDATE: user can only update their own rows
    EXECUTE format(
      'CREATE POLICY "User isolation update on %1$s" ON public.%1$s FOR UPDATE USING (auth.uid() = user_id);',
      tbl
    );
    -- DELETE: user can only delete their own rows
    EXECUTE format(
      'CREATE POLICY "User isolation delete on %1$s" ON public.%1$s FOR DELETE USING (auth.uid() = user_id);',
      tbl
    );
  END LOOP;
END $$;

-- Drill Library: public drills are readable by all authenticated users
CREATE POLICY "Public drills readable by all"
  ON public.drill_library FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'teams', 'players', 'game_schedules', 'match_analyses',
      'professional_summaries', 'tactical_goals', 'key_match_situations',
      'training_programs', 'training_session_evaluations', 'training_actions',
      'tactical_boards', 'lineup_templates', 'game_preps', 'conversations',
      'player_decision_profiles', 'match_decision_summaries',
      'training_program_reviews', 'program_outcomes', 'drill_library'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();',
      tbl
    );
  END LOOP;
END $$;
