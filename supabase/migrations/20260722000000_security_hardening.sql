-- ============================================================
-- Security hardening
-- 1. Lock privileged columns on public.profiles so a regular
--    user can no longer self-escalate to admin / paid access.
-- 2. Add a per-user daily LLM usage table (deny-all to clients;
--    only the service-role edge function touches it) used by the
--    invoke-llm function to cap abuse of the shared Gemini key.
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Admin helper. romfranko99@gmail.com is the super-admin and is
-- always treated as admin even before their profile.role is set,
-- so the account can bootstrap itself. Everyone else must have
-- profiles.role = 'admin'.
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
    WHERE id = auth.uid()
      AND (role = 'admin' OR email = 'romfranko99@gmail.com')
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 1. Protect privileged profile columns.
-- The "Users can update own profile" RLS policy lets a user update
-- their own row, but the row holds role / is_approved /
-- access_status / plan — the app's entire authorization + paywall
-- state. Without this trigger a user could self-grant admin and
-- paid access with a single client-side update. A BEFORE UPDATE
-- trigger keeps those columns pinned to their previous values for
-- anyone who is not an admin.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins: privileged columns are immutable.
  NEW.role          := OLD.role;
  NEW.is_approved   := OLD.is_approved;
  NEW.access_status := OLD.access_status;
  NEW.plan          := OLD.plan;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ────────────────────────────────────────────────────────────
-- 2. Per-user daily LLM usage counter.
-- RLS is enabled with NO policies, so the anon/authenticated client
-- key can neither read nor write it — only the service-role
-- edge function (invoke-llm) can, which is where the cap is enforced.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.llm_usage_daily (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.llm_usage_daily ENABLE ROW LEVEL SECURITY;
