-- Billing hardening (2026-08-13):
--
-- 1. trial_authorized_amount — the exact sum the customer authorized when the
--    trial started. Without it the trial-end charge re-priced season_full at
--    charge time: a 7-day trial crossing June 1st re-computed "months until
--    season end" to 12 and charged 1,800₪ against an authorized 150₪.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_authorized_amount integer;

-- 2. hyp_minted_orders — binds every minted pay Order to the account it was
--    created for. Trial callbacks cannot rely on APISign VERIFY (HYP's VERIFY
--    fails for held/Postpone transactions), so before this table a forged
--    Order string could re-point a real held transaction at another user's
--    subscription row. Service-role only: RLS enabled with no policies.
CREATE TABLE IF NOT EXISTS public.hyp_minted_orders (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  trial boolean NOT NULL DEFAULT false,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hyp_minted_orders ENABLE ROW LEVEL SECURITY;
