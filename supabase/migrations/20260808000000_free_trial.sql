-- ============================================================
-- Free 7-day trial support
--
-- New purchase flow: the card is verified (HYP Postpone) and saved as a
-- token, the subscription opens as status='trial' for 7 days, and the
-- charge-due-subscriptions edge function (run by cron) performs the first
-- charge at trial end and every monthly renewal after it via HYP soft
-- (server-to-server token) transactions.
-- ============================================================

-- Allow the new statuses. The original CHECK was declared inline on the
-- column, so its auto-generated name is subscriptions_status_check.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'inactive', 'trial', 'past_due'));

-- billing_key: the pricing key from hyp-payment (monthly | season_monthly |
--   season_full) — needed by the cron charger to know what to bill.
-- card_token / card_tokef: HYP token (19 digits) + expiry (YYMM) captured at
--   trial signup. Useless without the terminal credentials, which live only
--   in Supabase secrets.
-- next_charge_at: when the cron charger should bill this subscription next.
--   NULL = nothing scheduled (HK-managed subs, cancelled, or paid in full).
-- charge_attempts: consecutive failed charge attempts (reset on success).
-- trial_started_at: also serves as "this user already used their one trial".
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_key TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS card_token TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS card_tokef TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_charge_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS charge_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge
  ON subscriptions (next_charge_at) WHERE next_charge_at IS NOT NULL;

-- ============================================================
-- Cron: run the charger every hour.
-- Requires the pg_cron + pg_net extensions (Database → Extensions in the
-- Supabase dashboard) and a CRON_SECRET set BOTH as an edge-function secret
-- and in Vault under the name 'cron_secret':
--   select vault.create_secret('<the-secret>', 'cron_secret');
-- Then uncomment and run:
--
-- select cron.schedule(
--   'charge-due-subscriptions',
--   '15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://jtixfrsetegimecbkkas.supabase.co/functions/v1/charge-due-subscriptions',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ============================================================
