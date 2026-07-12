-- Add columns to persist AI-generated content so it loads from DB on subsequent visits.
-- All columns are nullable JSONB/TEXT — no data loss if empty.

-- Match-level AI content
ALTER TABLE public.match_analyses ADD COLUMN IF NOT EXISTS ai_summary JSONB;
ALTER TABLE public.match_analyses ADD COLUMN IF NOT EXISTS training_guides JSONB DEFAULT '{}'::jsonb;

-- Player-level AI content
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ai_report TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ai_report_updated_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ai_tips JSONB;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ai_tips_updated_at TIMESTAMPTZ;

-- Team-level AI content
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS training_analysis_cache JSONB;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS weekly_summary_cache JSONB;
