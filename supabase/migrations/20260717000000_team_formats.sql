-- ============================================================
-- Multi-format support: 7v7 / 9v9 / 11v11 teams
-- ============================================================
-- Israeli youth teams play 7v7 (ילדים) and 9v9; the app assumed
-- 11v11 everywhere. Adds the team's match format. Existing teams
-- keep playing 11v11 via the column default.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT '11v11';

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_format_check;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_format_check CHECK (format IN ('7v7', '9v9', '11v11'));

-- age_group already exists on teams (ילדים / נערים / נוער / בוגרים);
-- re-assert its check so both columns are guarded going forward.
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_age_group_check;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_age_group_check
  CHECK (age_group IS NULL OR age_group IN ('ילדים', 'נערים', 'נוער', 'בוגרים'));

-- The old formation checks only allowed 11v11 formations. Small-sided
-- formations (2-3-1, 3-3-2, ...) must be storable wherever a formation
-- is kept, so drop the restrictive checks instead of enumerating.
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_formation_check;
ALTER TABLE public.game_preps DROP CONSTRAINT IF EXISTS game_preps_opponent_formation_check;
ALTER TABLE public.lineup_templates DROP CONSTRAINT IF EXISTS lineup_templates_formation_check;
ALTER TABLE public.match_analyses DROP CONSTRAINT IF EXISTS match_analyses_opponent_formation_check;

-- RLS: teams already carries per-user policies ("Own rows ... on teams"
-- from 20260713000000_fix_broken_features.sql). New columns inherit row
-- policies automatically; nothing further to grant.
