-- Backfill player_id into match_analyses.player_ratings JSONB entries
-- The original 10 Arsenal matches were created with English player_name but no player_id.
-- This maps English names to the Hebrew-named players in the players table.

DO $$
DECLARE
  name_map JSONB := '{
    "David Raya":          "ffc0d629-ed4b-45b9-994b-24c22ca5f3c8",
    "Riccardo Calafiori":  "c25fb3e9-8e72-4f10-865d-2af021196a85",
    "William Saliba":      "f3c5be56-2030-4109-a170-f5eb05cfead8",
    "Gabriel Magalhães":   "8ff18519-61a3-4939-8c3a-765c0354f508",
    "Jurriën Timber":      "98283dc4-5b4c-4d70-94c6-bad03b9fa843",
    "Martin Ødegaard":     "c5597848-f43e-432c-8870-936277338893",
    "Declan Rice":         "e0adbe6e-6f2f-426a-82b5-305c4ab3d3c3",
    "Bukayo Saka":         "60aeaf75-a146-4cf2-a588-dcf7fdd38bb6",
    "Gabriel Martinelli":  "954f795f-916d-4c5b-9162-5fc5e9be5ffd",
    "Leandro Trossard":    "4106e8ae-98a9-40d0-9bfb-8fc49ca93666",
    "Mikel Merino":        "fb1cf598-133c-4682-9c71-5e413e7895ec",
    "Viktor Gyökeres":     "b7b65303-4f41-487d-9265-84be363b3b5b",
    "Ben White":           "99d1b255-211f-4fe2-bd9f-dec2e2870652",
    "Martín Zubimendi":    "07e5d22c-c352-4f2c-8daa-cc628d63cf38",
    "Cristhian Mosquera":  "21d9f29b-0313-49e1-87e8-3c7c708e2837",
    "Kai Havertz":         "a98f7fc6-b9f3-4738-8066-6f4e569c90d9"
  }'::jsonb;
  rec RECORD;
  new_ratings JSONB;
  elem JSONB;
  pid TEXT;
  i INT;
BEGIN
  FOR rec IN
    SELECT id, player_ratings
    FROM match_analyses
    WHERE player_ratings IS NOT NULL
      AND jsonb_typeof(player_ratings) = 'array'
      AND jsonb_array_length(player_ratings) > 0
  LOOP
    new_ratings := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(rec.player_ratings) - 1 LOOP
      elem := rec.player_ratings->i;
      -- Only backfill if player_id is missing
      IF elem->>'player_id' IS NULL OR elem->>'player_id' = '' THEN
        pid := name_map->>( elem->>'player_name' );
        IF pid IS NOT NULL THEN
          elem := elem || jsonb_build_object('player_id', pid);
        END IF;
      END IF;
      new_ratings := new_ratings || jsonb_build_array(elem);
    END LOOP;
    UPDATE match_analyses SET player_ratings = new_ratings WHERE id = rec.id;
  END LOOP;
END $$;
