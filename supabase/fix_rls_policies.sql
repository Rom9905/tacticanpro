-- Fix missing RLS policies for drill_library and player_attribute_history
-- drill_library: currently only has a SELECT policy for public drills
-- player_attribute_history: only has SELECT and INSERT policies

-- ═══════════════════════════════════════════════════════════════
-- drill_library: Add INSERT, UPDATE, DELETE policies
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can insert own drills"
  ON drill_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drills"
  ON drill_library FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drills"
  ON drill_library FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- player_attribute_history: Add UPDATE, DELETE policies
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can update own attribute history"
  ON player_attribute_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attribute history"
  ON player_attribute_history FOR DELETE
  USING (auth.uid() = user_id);
