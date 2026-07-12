-- ============================================================
-- Permanent player-rating pipeline (DB-level, works for every
-- current and future write path):
--   match_analyses.player_ratings ─► players.match_history
--                                 └► player_attribute_history (match_rating)
--   training_session_evaluations  ─► player_attribute_history (training_rating)
-- The AI evaluation (evaluate-player-attributes) reads all of these.
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. Extend player_attribute_history to record rating sources
ALTER TABLE public.player_attribute_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.player_attribute_history ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE public.player_attribute_history ADD COLUMN IF NOT EXISTS note TEXT;

-- Attribute snapshots are 1-5, match/training ratings are 1-10
ALTER TABLE public.player_attribute_history DROP CONSTRAINT IF EXISTS player_attribute_history_rating_check;
ALTER TABLE public.player_attribute_history
  ADD CONSTRAINT player_attribute_history_rating_check CHECK (rating BETWEEN 1 AND 10);

CREATE INDEX IF NOT EXISTS idx_pah_source ON public.player_attribute_history(source_id, player_id, attribute_name);

-- 2. Match ratings → players.match_history + player_attribute_history
CREATE OR REPLACE FUNCTION public.sync_player_ratings_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r JSONB;
  pid UUID;
  rating_num NUMERIC;
  entry JSONB;
  hist JSONB;
  idx INT;
  i INT;
BEGIN
  IF NEW.player_ratings IS NULL OR jsonb_typeof(NEW.player_ratings) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(NEW.player_ratings) LOOP
    BEGIN
      CONTINUE WHEN COALESCE((r->>'did_not_play')::boolean, false);
      CONTINUE WHEN NULLIF(r->>'player_id', '') IS NULL;
      CONTINUE WHEN NULLIF(r->>'rating', '') IS NULL;

      pid := (r->>'player_id')::uuid;
      rating_num := (r->>'rating')::numeric;
      CONTINUE WHEN rating_num IS NULL OR rating_num <= 0;

      -- Only touch players belonging to the same owner
      SELECT match_history INTO hist FROM players WHERE id = pid AND user_id = NEW.user_id;
      CONTINUE WHEN NOT FOUND;
      IF hist IS NULL OR jsonb_typeof(hist) <> 'array' THEN
        hist := '[]'::jsonb;
      END IF;

      entry := jsonb_build_object(
        'match_id', NEW.id::text,
        'opponent', COALESCE(NEW.opponent, ''),
        'date', COALESCE(NEW.date::text, ''),
        'rating', rating_num,
        'note', COALESCE(r->>'note', ''),
        'trend', 'ללא שינוי'
      );

      -- Upsert into match_history by match_id
      idx := NULL;
      IF jsonb_array_length(hist) > 0 THEN
        FOR i IN 0..jsonb_array_length(hist) - 1 LOOP
          IF hist->i->>'match_id' = NEW.id::text THEN
            idx := i;
            EXIT;
          END IF;
        END LOOP;
      END IF;

      IF idx IS NULL THEN
        hist := hist || jsonb_build_array(entry);
      ELSE
        hist := jsonb_set(hist, ARRAY[idx::text], (hist->idx) || entry);
      END IF;

      UPDATE players SET match_history = hist WHERE id = pid;

      -- Upsert attribute-history row for this match rating
      DELETE FROM player_attribute_history
        WHERE player_id = pid AND source_id = NEW.id AND attribute_name = 'match_rating';
      INSERT INTO player_attribute_history (player_id, user_id, attribute_name, rating, source, source_id, note)
        VALUES (pid, NEW.user_id, 'match_rating',
                LEAST(10, GREATEST(1, round(rating_num)::int)),
                'match', NEW.id, NULLIF(r->>'note', ''));
    EXCEPTION WHEN others THEN
      -- Never block the save because of one bad ratings row
      RAISE WARNING 'sync_player_ratings_from_match skipped a row: %', SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_player_ratings ON public.match_analyses;
CREATE TRIGGER trg_sync_player_ratings
  AFTER INSERT OR UPDATE OF player_ratings ON public.match_analyses
  FOR EACH ROW EXECUTE FUNCTION public.sync_player_ratings_from_match();

-- 3. Training evaluations → player_attribute_history
CREATE OR REPLACE FUNCTION public.sync_training_rating_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.rating IS NULL THEN
      RETURN NEW;
    END IF;
    DELETE FROM player_attribute_history
      WHERE player_id = NEW.player_id AND source_id = NEW.id AND attribute_name = 'training_rating';
    INSERT INTO player_attribute_history (player_id, user_id, attribute_name, rating, source, source_id, note)
      VALUES (NEW.player_id, NEW.user_id, 'training_rating',
              LEAST(10, GREATEST(1, round(NEW.rating)::int)),
              'training', NEW.id, NULLIF(NEW.coach_note, ''));
  EXCEPTION WHEN others THEN
    RAISE WARNING 'sync_training_rating_history failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_training_rating ON public.training_session_evaluations;
CREATE TRIGGER trg_sync_training_rating
  AFTER INSERT OR UPDATE OF rating, coach_note ON public.training_session_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.sync_training_rating_history();

-- 4. Backfill: sync existing data through the same functions
UPDATE public.match_analyses
  SET player_ratings = player_ratings
  WHERE player_ratings IS NOT NULL AND jsonb_array_length(player_ratings) > 0;

UPDATE public.training_session_evaluations
  SET rating = rating
  WHERE rating IS NOT NULL;
