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

-- ────────────────────────────────────────────────────────────
-- 2b. Processed payment transactions (replay protection for hyp-callback).
-- The callback records each HYP transaction id here; a repeated id is
-- rejected so a verified success can't be replayed to extend/re-grant a
-- subscription. Service-role only (RLS on, no policies).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hyp_processed_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_id        UUID,
  billing_key    TEXT,
  amount         INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hyp_processed_transactions ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3. User-created drills default to PRIVATE.
-- is_public defaulted to true, so every drill a coach created
-- leaked to all other coaches via the "public drills" SELECT policy.
-- New rows are private unless the coach explicitly shares them.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.drill_library ALTER COLUMN is_public SET DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 4. Add WITH CHECK to every user-isolation UPDATE policy.
-- The original policies only had USING (which row you may touch)
-- but no WITH CHECK (what the row may become), so a user could
-- UPDATE their own row and set user_id to someone else's id,
-- donating/orphaning the record into another tenant.
-- ────────────────────────────────────────────────────────────
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
      'training_program_reviews', 'program_outcomes', 'analytics_events',
      'drill_library'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "User isolation update on %1$s" ON public.%1$s;', tbl);
    EXECUTE format(
      'CREATE POLICY "User isolation update on %1$s" ON public.%1$s FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      tbl
    );
  END LOOP;
END $$;
