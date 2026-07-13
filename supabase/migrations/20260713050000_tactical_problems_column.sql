ALTER TABLE match_analyses
ADD COLUMN IF NOT EXISTS tactical_problems JSONB;
