-- =============================================
-- Self-service cancellation support
-- Run this in Supabase SQL Editor. Safe to re-run.
-- =============================================

-- hk_id: the HYP standing-order agreement id (HKId) returned on HK purchases.
--        Needed to stop future recurring charges via the HKStatus API.
--        NULL for upfront (season_full) purchases and legacy subscriptions.
-- cancelled_at: when the user cancelled. Access continues until end_date;
--        the row simply stops being extended/renewed.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS hk_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
