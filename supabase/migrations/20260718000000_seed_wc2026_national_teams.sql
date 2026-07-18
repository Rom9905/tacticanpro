-- ============================================================
-- Seed: נבחרת ארגנטינה + נבחרת ספרד — מונדיאל 2026
-- ============================================================
-- Official 26-man squads (announced May 2026; Senesi replaced the
-- injured Balerdi before the opener). Created under the admin user;
-- existing teams are never touched. Values use only the app's
-- predefined Hebrew enums (positions, roles, strengths, improvements).

DO $$
DECLARE
  uid UUID;
  arg UUID := 'b7a1e2c0-2026-4a00-a001-000000000001';
  esp UUID := 'b7a1e2c0-2026-4a00-a002-000000000002';
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'romfranko99@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'admin user not found — skipping WC2026 seed';
    RETURN;
  END IF;

  -- Teams (fixed fresh UUIDs — cannot collide with existing rows)
  INSERT INTO public.teams (id, user_id, name, age_group, format, league, formation, playing_style, tactical_focus)
  VALUES
    (arg, uid, 'נבחרת ארגנטינה', 'בוגרים', '11v11', 'מונדיאל 2026', '4-3-3', 'מאוזן', 'גמישות טקטית, לחץ מתוזמן ומעברים מהירים סביב מסי'),
    (esp, uid, 'נבחרת ספרד', 'בוגרים', '11v11', 'מונדיאל 2026', '4-3-3', 'החזקת כדור', 'משחק פוזיציוני, שליטה במרכז ורוחב דרך הכנפיים')
  ON CONFLICT (id) DO NOTHING;

  -- Re-seed players for these two teams only (idempotent re-run)
  DELETE FROM public.players WHERE team_id IN (arg, esp);

  -- ═══════════ ארגנטינה — שוערים ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, arg, 'אמיליאנו מרטינס', 23, 'שוער', 'שוער יוזם', 'ימין', 'הרכב', 'זמין', true,
   '{"reflexes":5,"shot_stopping":5,"one_on_one":5,"high_balls":4,"positioning":4,"timing":4,"box_control":4,"short_passing":4,"long_passing":4,"decision_under_pressure":5,"agility":4,"jumping":4,"physical_strength":4}',
   ARRAY['שמירה באחד על אחד','קבלת החלטות תחת לחץ','מנהיגות','ריכוז לאורך משחק'],
   ARRAY['משמעת קבוצתית']),
  (uid, arg, 'חרונימו רולי', 12, 'שוער', 'שוער יוזם', 'ימין', 'רוטציה', 'זמין', false,
   '{"reflexes":4,"shot_stopping":4,"one_on_one":4,"high_balls":3,"positioning":3,"timing":3,"box_control":3,"short_passing":4,"long_passing":3,"decision_under_pressure":3,"agility":4,"jumping":3,"physical_strength":3}',
   ARRAY['בנייה משוער','שליטה תחת לחץ'],
   ARRAY['תזמון יציאה ללחץ']),
  (uid, arg, 'חואן מוסו', 1, 'שוער', 'שוער שומר', 'ימין', 'ספסל', 'זמין', false,
   '{"reflexes":4,"shot_stopping":4,"one_on_one":3,"high_balls":4,"positioning":4,"timing":3,"box_control":3,"short_passing":3,"long_passing":3,"decision_under_pressure":3,"agility":3,"jumping":3,"physical_strength":4}',
   ARRAY['מיקום הגנתי','ריכוז לאורך משחק'],
   ARRAY['בנייה משוער']);

  -- ═══════════ ארגנטינה — הגנה ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, arg, 'נאוול מולינה', 26, 'מגן ימין', 'כנף ימין', 'מגן תומך', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":3,"dribbling":3,"finishing":2,"tackling":3,"defensive_positioning":3,"speed":4,"strength":3,"heading":2,"vision":3,"decision_making":3}',
   ARRAY['מהירות','ריצות עומק','מיקום התקפי'],
   ARRAY['1 על 1 הגנתי','שמירה על מבנה']),
  (uid, arg, 'גונסאלו מונטיאל', 4, 'מגן ימין', NULL, 'מגן תומך', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":4,"strength":3,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['תיקולים','שמירה באחד על אחד','קבלת החלטות תחת לחץ'],
   ARRAY['מיקום התקפי']),
  (uid, arg, 'כריסטיאן רומרו', 13, 'בלם', NULL, 'בלם מוביל', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":3,"dribbling":2,"finishing":2,"tackling":5,"defensive_positioning":4,"speed":4,"strength":4,"heading":4,"vision":3,"decision_making":3}',
   ARRAY['תיקולים','1 על 1 הגנתי','משחק ראש','אינטנסיביות'],
   ARRAY['משמעת קבוצתית','תגובה לטעויות']),
  (uid, arg, 'ליסנדרו מרטינס', 6, 'בלם', 'מגן שמאל', 'בלם מוביל', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":3,"finishing":1,"tackling":5,"defensive_positioning":4,"speed":3,"strength":4,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['תיקולים','פתיחת קווי מסירה','שליטה תחת לחץ','אינטנסיביות'],
   ARRAY['משחק ראש']),
  (uid, arg, 'ניקולאס אוטמנדי', 19, 'בלם', NULL, 'בלם מוביל', 'שמאל', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":2,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":2,"strength":4,"heading":4,"vision":3,"decision_making":4}',
   ARRAY['מנהיגות','משחק ראש','מיקום הגנתי','קריאת מסירה'],
   ARRAY['מהירות']),
  (uid, arg, 'מרקוס סנסי', 2, 'בלם', NULL, 'בלם כיסוי', 'שמאל', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":3,"strength":4,"heading":4,"vision":3,"decision_making":3}',
   ARRAY['תיקולים','משחק ראש','מסירות ארוכות'],
   ARRAY['קבלת החלטות תחת לחץ']),
  (uid, arg, 'פאקונדו מדינה', 25, 'בלם', 'מגן שמאל', 'בלם כיסוי', 'שמאל', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":3,"finishing":1,"tackling":4,"defensive_positioning":3,"speed":3,"strength":4,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['כוח פיזי','אינטנסיביות','1 על 1 הגנתי'],
   ARRAY['ריכוז לאורך משחק','משמעת קבוצתית']),
  (uid, arg, 'ניקולאס טליאפיקו', 3, 'מגן שמאל', NULL, 'מגן מכסה', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":3,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":3,"strength":3,"heading":3,"vision":3,"decision_making":4}',
   ARRAY['מיקום הגנתי','אחריות טקטית','משמעת קבוצתית'],
   ARRAY['1 על 1 התקפי']),
  (uid, arg, 'ולנטין בארקו', 8, 'מגן שמאל', 'כנף שמאל', 'מגן תומך', 'שמאל', 'ספסל', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":2,"tackling":3,"defensive_positioning":2,"speed":4,"strength":2,"heading":2,"vision":4,"decision_making":3}',
   ARRAY['דריבלים','מיקום התקפי','מסירות קצרות'],
   ARRAY['מיקום הגנתי','יכולת חזרה להגנה']);

  -- ═══════════ ארגנטינה — קישור ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, arg, 'רודריגו דה פול', 7, 'קשר מרכזי', NULL, 'בוקס טו בוקס', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":4,"finishing":2,"tackling":4,"defensive_positioning":3,"speed":4,"strength":3,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['אינטנסיביות','סיבולת','ראיית משחק','תגובה לאיבוד כדור'],
   ARRAY['בעיטות']),
  (uid, arg, 'אנזו פרננדס', 24, 'קשר מרכזי', 'קשר הגנתי', 'קשר עמוק', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":3,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":3,"strength":3,"heading":2,"vision":5,"decision_making":4}',
   ARRAY['מסירות ארוכות','ראיית משחק','קצב משחק','שליטה תחת לחץ'],
   ARRAY['1 על 1 הגנתי']),
  (uid, arg, 'אלכסיס מק אליסטר', 20, 'קשר מרכזי', 'קשר התקפי', 'קשר מחבר', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":3,"strength":3,"heading":3,"vision":5,"decision_making":5}',
   ARRAY['ראיית משחק','משחק בין הקווים','החלטות','מסירות קצרות'],
   ARRAY['כוח פיזי']),
  (uid, arg, 'לאנדרו פארדס', 5, 'קשר הגנתי', NULL, 'קשר עמוק', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":5,"dribbling":3,"finishing":2,"tackling":3,"defensive_positioning":3,"speed":2,"strength":3,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['מסירות ארוכות','קצב משחק','פתיחת קווי מסירה'],
   ARRAY['מהירות','יכולת חזרה להגנה']),
  (uid, arg, 'אסקיאל פלאסיוס', 14, 'קשר מרכזי', NULL, 'בוקס טו בוקס', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":3,"speed":3,"strength":3,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['סיבולת','קריאת מסירה','משחק בין הקווים'],
   ARRAY['עמידות בעומס משחק']),
  (uid, arg, 'ג''ובאני לו סלסו', 11, 'קשר התקפי', NULL, 'יוצר משחק', 'שמאל', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":3,"tackling":2,"defensive_positioning":2,"speed":3,"strength":2,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['משחק בין הקווים','דריבלים','ראיית משחק'],
   ARRAY['עבודה הגנתית']),
  (uid, arg, 'תיאגו אלמדה', 16, 'קשר התקפי', 'כנף שמאל', 'עשר קלאסי', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":5,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":4,"strength":2,"heading":1,"vision":4,"decision_making":4}',
   ARRAY['דריבלים','1 על 1 התקפי','בעיטות','תנועה ללא כדור'],
   ARRAY['כוח פיזי','עבודה הגנתית']),
  (uid, arg, 'ניקולאס פאס', 18, 'קשר התקפי', NULL, 'עשר קלאסי', 'שמאל', 'ספסל', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":3,"strength":2,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['ראיית משחק','בעיטות','משחק בין הקווים'],
   ARRAY['כוח פיזי','אינטנסיביות']),
  (uid, arg, 'ג''וליאנו סימאונה', 17, 'כנף ימין', 'כנף שמאל', 'כנף חודרני', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":5,"strength":3,"heading":2,"vision":3,"decision_making":3}',
   ARRAY['מהירות','אינטנסיביות','יכולת חזרה להגנה','ריצות עומק'],
   ARRAY['קריאת מסירה']);

  -- ═══════════ ארגנטינה — התקפה ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, arg, 'ליאונל מסי', 10, 'כנף ימין', 'קשר התקפי', 'יוצר משחק', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":5,"finishing":5,"tackling":1,"defensive_positioning":1,"speed":3,"strength":2,"heading":2,"vision":5,"decision_making":5}',
   ARRAY['דריבלים','ראיית משחק','בעיטות','מנהיגות','החלטות'],
   ARRAY['עבודה הגנתית']),
  (uid, arg, 'חוליאן אלוורס', 9, 'חלוץ', 'כנף ימין', 'חלוץ נופל', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":4,"finishing":5,"tackling":3,"defensive_positioning":2,"speed":4,"strength":3,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['תנועה ללא כדור','בעיטות','אינטנסיביות','תזמון יציאה ללחץ'],
   ARRAY['משחק ראש']),
  (uid, arg, 'לאוטרו מרטינס', 22, 'חלוץ', NULL, 'חלוץ מסיים', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":5,"tackling":2,"defensive_positioning":2,"speed":4,"strength":4,"heading":4,"vision":3,"decision_making":4}',
   ARRAY['בעיטות','משחק גב','משחק ראש','כוח פיזי'],
   ARRAY['משחק בלחץ']),
  (uid, arg, 'ניקולאס גונסאלס', 15, 'כנף שמאל', 'כנף ימין', 'כנף רחב', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":4,"strength":3,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['מהירות','משחק ראש','יכולת חזרה להגנה'],
   ARRAY['החלטות']),
  (uid, arg, 'חוסה מנואל לופס', 21, 'חלוץ', NULL, 'חלוץ מטרה', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":3,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":3,"strength":4,"heading":4,"vision":3,"decision_making":3}',
   ARRAY['משחק גב','משחק ראש','כוח פיזי'],
   ARRAY['מהירות','משחק בלחץ']);

  -- ═══════════ ספרד — שוערים ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, esp, 'אונאי סימון', 23, 'שוער', 'שוער יוזם', 'ימין', 'הרכב', 'זמין', true,
   '{"reflexes":4,"shot_stopping":4,"one_on_one":4,"high_balls":4,"positioning":4,"timing":4,"box_control":4,"short_passing":4,"long_passing":4,"decision_under_pressure":4,"agility":4,"jumping":4,"physical_strength":4}',
   ARRAY['בנייה משוער','קבלת החלטות תחת לחץ','ריכוז לאורך משחק'],
   ARRAY['תגובה לטעויות']),
  (uid, esp, 'דויד ראיה', 1, 'שוער', 'שוער יוזם', 'ימין', 'רוטציה', 'זמין', false,
   '{"reflexes":5,"shot_stopping":4,"one_on_one":4,"high_balls":4,"positioning":4,"timing":4,"box_control":4,"short_passing":5,"long_passing":4,"decision_under_pressure":4,"agility":4,"jumping":3,"physical_strength":3}',
   ARRAY['בנייה משוער','שמירה באחד על אחד','שליטה תחת לחץ'],
   ARRAY['משחק ראש']),
  (uid, esp, 'ז''ואן גארסיה', 13, 'שוער', 'שוער יוזם', 'ימין', 'ספסל', 'זמין', false,
   '{"reflexes":5,"shot_stopping":4,"one_on_one":4,"high_balls":4,"positioning":4,"timing":3,"box_control":3,"short_passing":4,"long_passing":4,"decision_under_pressure":4,"agility":5,"jumping":4,"physical_strength":3}',
   ARRAY['שמירה באחד על אחד','בנייה משוער'],
   ARRAY['ריכוז לאורך משחק']);

  -- ═══════════ ספרד — הגנה ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, esp, 'פדרו פורו', 12, 'מגן ימין', 'כנף ימין', 'מגן תומך', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":4,"strength":3,"heading":2,"vision":4,"decision_making":3}',
   ARRAY['מיקום התקפי','מסירות ארוכות','ריצות עומק'],
   ARRAY['1 על 1 הגנתי','שמירה על מבנה']),
  (uid, esp, 'מארק פוביל', 2, 'מגן ימין', NULL, 'מגן תומך', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":3,"finishing":2,"tackling":3,"defensive_positioning":3,"speed":4,"strength":3,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['מהירות','כוח פיזי','ריצות עומק'],
   ARRAY['קריאת מסירה']),
  (uid, esp, 'מרקוס יורנטה', 5, 'מגן ימין', 'קשר מרכזי', 'מגן תומך', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":5,"strength":4,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['מהירות','סיבולת','ריצות עומק','עמידות בעומס משחק'],
   ARRAY['מיקום הגנתי']),
  (uid, esp, 'פאו קוברסי', 22, 'בלם', NULL, 'בלם מוביל', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":3,"finishing":1,"tackling":4,"defensive_positioning":4,"speed":3,"strength":3,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['פתיחת קווי מסירה','קריאת מסירה','שליטה תחת לחץ','מסירות ארוכות'],
   ARRAY['כוח פיזי','משחק ראש']),
  (uid, esp, 'אימריק לאפורט', 14, 'בלם', NULL, 'בלם כיסוי', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":3,"strength":4,"heading":4,"vision":4,"decision_making":4}',
   ARRAY['משחק ראש','מיקום הגנתי','מסירות ארוכות','שליטה תחת לחץ'],
   ARRAY['מהירות']),
  (uid, esp, 'אריק גארסיה', 4, 'בלם', 'קשר הגנתי', 'בלם כיסוי', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":3,"finishing":2,"tackling":3,"defensive_positioning":4,"speed":2,"strength":3,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['קריאת מסירה','אחריות טקטית','שמירה על מבנה'],
   ARRAY['מהירות','כוח פיזי']),
  (uid, esp, 'מארק קוקוראיה', 24, 'מגן שמאל', NULL, 'מגן תומך', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":4,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":4,"strength":3,"heading":3,"vision":3,"decision_making":4}',
   ARRAY['אינטנסיביות','1 על 1 הגנתי','יכולת חזרה להגנה','תגובה לאיבוד כדור'],
   ARRAY['בעיטות']),
  (uid, esp, 'אלחנדרו גרימלדו', 3, 'מגן שמאל', 'כנף שמאל', 'מגן תומך', 'שמאל', 'רוטציה', 'זמין', false,
   '{"passing":5,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":4,"strength":2,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['בעיטות','מסירות ארוכות','מיקום התקפי'],
   ARRAY['1 על 1 הגנתי']);

  -- ═══════════ ספרד — קישור ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, esp, 'רודרי', 16, 'קשר הגנתי', NULL, 'קשר עמוק', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":4,"finishing":3,"tackling":4,"defensive_positioning":5,"speed":3,"strength":4,"heading":4,"vision":5,"decision_making":5}',
   ARRAY['ראיית משחק','קצב משחק','שמירה על מבנה','החלטות','מנהיגות'],
   ARRAY['מהירות']),
  (uid, esp, 'מרטין סובימנדי', 18, 'קשר הגנתי', NULL, 'אנקר הגנתי', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":5,"dribbling":3,"finishing":2,"tackling":4,"defensive_positioning":4,"speed":3,"strength":3,"heading":3,"vision":4,"decision_making":5}',
   ARRAY['קריאת מסירה','אחריות טקטית','קצב משחק','משמעת קבוצתית'],
   ARRAY['בעיטות']),
  (uid, esp, 'פדרי', 20, 'קשר מרכזי', 'קשר התקפי', 'יוצר משחק', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":5,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":3,"strength":2,"heading":2,"vision":5,"decision_making":5}',
   ARRAY['משחק בין הקווים','שליטה תחת לחץ','ראיית משחק','תנועה ללא כדור','קצב משחק'],
   ARRAY['עמידות בעומס משחק']),
  (uid, esp, 'פביאן רואיס', 8, 'קשר מרכזי', NULL, 'קשר מחבר', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":4,"finishing":3,"tackling":3,"defensive_positioning":3,"speed":3,"strength":3,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['שליטה תחת לחץ','מסירות קצרות','משחק בין הקווים','ראיית משחק'],
   ARRAY['אינטנסיביות']),
  (uid, esp, 'גאבי', 9, 'קשר מרכזי', 'קשר התקפי', 'בוקס טו בוקס', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":3,"tackling":4,"defensive_positioning":3,"speed":4,"strength":3,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['אינטנסיביות','תגובה לאיבוד כדור','משחק בין הקווים','תזמון יציאה ללחץ'],
   ARRAY['משמעת קבוצתית','החלטות']),
  (uid, esp, 'מיקל מרינו', 6, 'קשר מרכזי', 'חלוץ', 'בוקס טו בוקס', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":3,"finishing":3,"tackling":4,"defensive_positioning":3,"speed":3,"strength":4,"heading":4,"vision":4,"decision_making":4}',
   ARRAY['משחק ראש','כוח פיזי','הצטרפות מאוחרת לרחבה'],
   ARRAY['מהירות']),
  (uid, esp, 'אלכס באנה', 15, 'קשר התקפי', 'כנף שמאל', 'יוצר משחק', 'שמאל', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":3,"tackling":2,"defensive_positioning":2,"speed":3,"strength":2,"heading":2,"vision":5,"decision_making":4}',
   ARRAY['קריאת מסירה','חיתוך קווי מסירה','בעיטות'],
   ARRAY['עבודה הגנתית','כוח פיזי']),
  (uid, esp, 'דני אולמו', 10, 'קשר התקפי', 'כנף שמאל', 'עשר קלאסי', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":4,"dribbling":4,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":3,"strength":2,"heading":2,"vision":4,"decision_making":4}',
   ARRAY['משחק בין הקווים','דריבלים','בעיטות','תנועה ללא כדור'],
   ARRAY['עמידות בעומס משחק']);

  -- ═══════════ ספרד — התקפה ═══════════
  INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, is_starter, skill_ratings, strengths, improvements) VALUES
  (uid, esp, 'לאמין ימאל', 19, 'כנף ימין', 'קשר התקפי', 'כנף חותך', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":5,"dribbling":5,"finishing":4,"tackling":1,"defensive_positioning":2,"speed":4,"strength":2,"heading":1,"vision":5,"decision_making":4}',
   ARRAY['דריבלים','1 על 1 התקפי','ראיית משחק','חיתוך קווי מסירה','בעיטות'],
   ARRAY['עבודה הגנתית','כוח פיזי']),
  (uid, esp, 'ניקו וויליאמס', 17, 'כנף שמאל', 'כנף ימין', 'כנף חודרני', 'ימין', 'הרכב', 'זמין', true,
   '{"passing":3,"dribbling":5,"finishing":3,"tackling":2,"defensive_positioning":2,"speed":5,"strength":3,"heading":2,"vision":3,"decision_making":3}',
   ARRAY['מהירות','דריבלים','1 על 1 התקפי','ריצות עומק'],
   ARRAY['החלטות','חיתוך קווי מסירה']),
  (uid, esp, 'מיקל אויארסבאל', 21, 'חלוץ', 'כנף שמאל', 'חלוץ נופל', 'שמאל', 'הרכב', 'זמין', true,
   '{"passing":4,"dribbling":3,"finishing":4,"tackling":3,"defensive_positioning":3,"speed":3,"strength":3,"heading":3,"vision":4,"decision_making":4}',
   ARRAY['תנועה ללא כדור','בעיטות','מנהיגות','קבלת החלטות תחת לחץ'],
   ARRAY['משחק ראש']),
  (uid, esp, 'פראן טורס', 7, 'חלוץ', 'כנף ימין', 'חלוץ מסיים', 'ימין', 'רוטציה', 'זמין', false,
   '{"passing":3,"dribbling":3,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":4,"strength":2,"heading":3,"vision":3,"decision_making":3}',
   ARRAY['תנועה ללא כדור','ריצות עומק','זיהוי יתרון מספרי'],
   ARRAY['משחק גב','כוח פיזי']),
  (uid, esp, 'ירמי פינו', 11, 'כנף ימין', 'כנף שמאל', 'כנף חותך', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":3,"tackling":2,"defensive_positioning":2,"speed":4,"strength":2,"heading":2,"vision":3,"decision_making":3}',
   ARRAY['דריבלים','מהירות','1 על 1 התקפי'],
   ARRAY['החלטות','עבודה הגנתית']),
  (uid, esp, 'ויקטור מוניוס', 25, 'כנף שמאל', 'כנף ימין', 'כנף חודרני', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":4,"finishing":3,"tackling":2,"defensive_positioning":2,"speed":4,"strength":2,"heading":2,"vision":3,"decision_making":3}',
   ARRAY['מהירות','ריצות עומק','1 על 1 התקפי'],
   ARRAY['קבלת החלטות תחת לחץ','שמירה על מבנה']),
  (uid, esp, 'בורחה איגלסיאס', 26, 'חלוץ', NULL, 'חלוץ מטרה', 'ימין', 'ספסל', 'זמין', false,
   '{"passing":3,"dribbling":2,"finishing":4,"tackling":2,"defensive_positioning":2,"speed":2,"strength":4,"heading":4,"vision":3,"decision_making":3}',
   ARRAY['משחק גב','משחק ראש','כוח פיזי','הצטרפות מאוחרת לרחבה'],
   ARRAY['מהירות']);

END $$;
