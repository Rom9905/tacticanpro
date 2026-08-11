-- ============================================================
-- Fix: admin policy on subscriptions blocked EVERY user's read.
--
-- The old policy ran `auth.uid() IN (SELECT id FROM auth.users WHERE ...)`.
-- The `authenticated` role has no SELECT grant on auth.users, so evaluating
-- the policy threw "permission denied for table users" for every non-admin
-- SELECT on subscriptions. The app read that error as "no subscription" and
-- blocked paying/trial users (admin never noticed — App.jsx short-circuits
-- on the admin email client-side).
--
-- The replacement reads the email claim from the JWT itself — no table
-- access, evaluated per-request, same admin semantics.
-- ============================================================

DROP POLICY IF EXISTS "Admin full access to subscriptions" ON subscriptions;

CREATE POLICY "Admin full access to subscriptions"
  ON subscriptions FOR ALL
  USING ((auth.jwt() ->> 'email') = 'romfranko99@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'romfranko99@gmail.com');
