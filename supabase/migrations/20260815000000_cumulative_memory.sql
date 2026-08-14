-- ============================================================
-- Cumulative memory engine (2026-08-15)
-- ============================================================
-- The analysis engine gains a season-long memory. Everything here
-- extends existing tables — occurrence_count / last_seen_date /
-- match_history already carry the history itself; these columns store
-- what the engine DERIVES from it so a prompt can be built with a
-- couple of bounded queries instead of recomputing per analysis.
-- Idempotent.

-- 1. Per-player rating trend over the recent window.
--    Derived from players.match_history (maintained by the rating
--    pipeline triggers), recomputed after every match.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS rating_trend TEXT,
  ADD COLUMN IF NOT EXISTS rating_trend_updated_at TIMESTAMPTZ;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_rating_trend_check;
ALTER TABLE public.players
  ADD CONSTRAINT players_rating_trend_check
  CHECK (rating_trend IS NULL OR rating_trend IN ('improving', 'stable', 'declining'));

-- 2. "What worked": link a training action to the problem it addresses,
--    so a problem that stops recurring can credit the work that preceded
--    its resolution.
ALTER TABLE public.training_actions
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES public.tactical_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_actions_linked_goal
  ON public.training_actions(linked_goal_id);

-- 3. Resolution bookkeeping on the problem itself. resolved_by_action_id
--    is the recommendation that was open when the problem stopped
--    recurring; fading_since marks a problem that has gone quiet but has
--    not yet aged out of the decay window.
ALTER TABLE public.tactical_goals
  ADD COLUMN IF NOT EXISTS resolved_by_action_id UUID REFERENCES public.training_actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at DATE,
  ADD COLUMN IF NOT EXISTS fading_since DATE,
  -- How many matches have been analysed since this problem last appeared.
  -- Cheaper than re-deriving it from source_summaries on every prompt build.
  ADD COLUMN IF NOT EXISTS matches_since_seen INTEGER DEFAULT 0;
