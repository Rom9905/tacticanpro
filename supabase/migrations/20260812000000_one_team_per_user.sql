-- ============================================================
-- One team per user (admins exempt).
--
-- The UI hides the "new team" action once a coach has a team, but the
-- limit has to hold at the database too — the client can be bypassed by
-- calling PostgREST directly with the anon key.
--
-- Existing users who already have more than one team keep them; the rule
-- only blocks NEW inserts beyond the first.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_one_team_per_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (profiles.role = 'admin' or the super-admin email) are exempt.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'TEAM_LIMIT_REACHED'
      USING HINT = 'Each account may manage a single team.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_team_per_user_trg ON public.teams;
CREATE TRIGGER enforce_one_team_per_user_trg
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_team_per_user();
