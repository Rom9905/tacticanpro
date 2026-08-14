-- The profiles guard trigger (20260722000000) pins role/is_approved/
-- access_status/plan for anyone who is not an admin, deciding via
-- public.is_admin(), which resolves auth.uid(). The service role has NO
-- auth.uid(), so a trusted server-side caller (an edge function using the
-- service key) was silently treated as an anonymous user and its writes to
-- those columns were reverted with no error — proven empirically: a
-- service-role UPDATE setting role='admin' came back as 'user'.
--
-- That made it impossible to promote an admin from the admin console.
--
-- Allowing a NULL auth.uid() through is safe: the only way to reach this
-- trigger at all is an UPDATE that passed RLS, and the profiles UPDATE policy
-- requires auth.uid() = id — which no anonymous request can satisfy. So a
-- NULL auth.uid() here means the service role (or a direct psql/SQL-editor
-- session), both of which are trusted by definition.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server-side callers (service role / direct DB session) and admins
  -- may change anything.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated users: privileged columns are immutable.
  NEW.role          := OLD.role;
  NEW.is_approved   := OLD.is_approved;
  NEW.access_status := OLD.access_status;
  NEW.plan          := OLD.plan;
  RETURN NEW;
END;
$$;
