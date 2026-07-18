-- ============================================================
-- WC2026 game preps: hand off the analysis to the app's AI
-- ============================================================
-- The two opponent preps were seeded with a hand-written ai_analysis
-- (plus a matching fingerprint that pinned it). The coach prefers the
-- app to generate the analysis itself from the form data. Clearing
-- ai_analysis makes MatchdayHub regenerate it on open, from the scouting
-- fields and recommended lineup that remain untouched.

UPDATE public.game_preps
SET ai_analysis = NULL
WHERE team_id IN (
  'b7a1e2c0-2026-4a00-a001-000000000001',
  'b7a1e2c0-2026-4a00-a002-000000000002'
);
