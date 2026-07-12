-- Player Attribute Rating History
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS player_attribute_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pah_player_attr ON player_attribute_history(player_id, attribute_name, recorded_at DESC);

ALTER TABLE player_attribute_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own player attribute history" ON player_attribute_history;
CREATE POLICY "Users can read own player attribute history"
  ON player_attribute_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player attribute history" ON player_attribute_history;
CREATE POLICY "Users can insert own player attribute history"
  ON player_attribute_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
