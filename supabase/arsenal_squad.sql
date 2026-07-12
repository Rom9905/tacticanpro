-- =============================================
-- Arsenal FC 2025/26 Squad — CORRECTED
-- Run in Supabase SQL Editor
-- =============================================
-- skill_ratings: 1-5 scale
-- Field players: passing, dribbling, finishing, tackling, defensive_positioning, speed, strength, heading, vision, decision_making
-- GK: reflexes, shot_stopping, one_on_one, high_balls, positioning, timing, box_control, short_passing, long_passing, decision_under_pressure, agility, jumping, physical_strength
-- strengths/improvements: from app's predefined lists only
-- positions: שוער, בלם, מגן ימין, מגן שמאל, קשר הגנתי, קשר מרכזי, קשר התקפי, כנף ימין, כנף שמאל, חלוץ

-- 1. Create team
INSERT INTO public.teams (id, user_id, name, age_group, league, formation, playing_style, tactical_focus)
VALUES (
  'a1b2c3d4-0001-4000-a000-000000000001',
  'c8633898-5dd6-4695-a540-35240cdf6fe0',
  'Arsenal FC',
  'בוגרים',
  'Premier League',
  '4-3-3',
  'possession',
  'Build-up play, high press, positional dominance'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Delete existing players for this team (clean re-insert)
DELETE FROM public.players WHERE team_id = 'a1b2c3d4-0001-4000-a000-000000000001';

-- 3. Insert players
DO $$
DECLARE
  tid UUID := 'a1b2c3d4-0001-4000-a000-000000000001';
  uid UUID := 'c8633898-5dd6-4695-a540-35240cdf6fe0';
BEGIN

-- ============ GOALKEEPERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, role, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'David Raya', 1, 'שוער', 'שוער יוזם', 'right', 'starter', 'available',
 '{"reflexes": 5, "shot_stopping": 4, "one_on_one": 4, "high_balls": 4, "positioning": 4, "timing": 4, "box_control": 4, "short_passing": 5, "long_passing": 4, "decision_under_pressure": 4, "agility": 4, "jumping": 3, "physical_strength": 3}',
 ARRAY['רפלקסים', 'שליטה בכדור ברגל', 'אחד על אחד', 'בנייה מהגנה', 'מסירה קצרה'],
 ARRAY['יציאה לכדורי גובה', 'תקשורת עם ההגנה']),

(uid, tid, 'Kepa Arrizabalaga', 13, 'שוער', 'שוער יוזם', 'right', 'bench', 'available',
 '{"reflexes": 4, "shot_stopping": 4, "one_on_one": 3, "high_balls": 3, "positioning": 3, "timing": 3, "box_control": 3, "short_passing": 4, "long_passing": 3, "decision_under_pressure": 3, "agility": 3, "jumping": 3, "physical_strength": 3}',
 ARRAY['שליטה בכדור ברגל', 'מסירה קצרה', 'עמידות בלחץ'],
 ARRAY['יציאה לכדורי גובה', 'ריכוז לאורך משחק']),

(uid, tid, 'Karl Hein', 31, 'שוער', 'שוער שומר', 'right', 'reserve', 'available',
 '{"reflexes": 3, "shot_stopping": 3, "one_on_one": 3, "high_balls": 3, "positioning": 3, "timing": 3, "box_control": 2, "short_passing": 3, "long_passing": 2, "decision_under_pressure": 2, "agility": 3, "jumping": 3, "physical_strength": 3}',
 ARRAY['רפלקסים', 'קפיצה', 'אומץ'],
 ARRAY['שליטה בכדור ברגל', 'קריאת המשחק']);

-- ============ DEFENDERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'William Saliba', 2, 'בלם', NULL, 'בלם כיסוי', 'right', 'starter', 'available',
 '{"passing": 4, "dribbling": 3, "finishing": 1, "tackling": 5, "defensive_positioning": 5, "speed": 4, "strength": 4, "heading": 5, "vision": 3, "decision_making": 5}',
 ARRAY['תיקולים', 'מיקום הגנתי', 'משחק ראש', 'שליטה תחת לחץ', 'ריכוז'],
 ARRAY['מסירות ארוכות', 'ריצות עומק']),

(uid, tid, 'Gabriel Magalhães', 6, 'בלם', NULL, 'בלם מוביל', 'left', 'starter', 'available',
 '{"passing": 3, "dribbling": 2, "finishing": 2, "tackling": 5, "defensive_positioning": 4, "speed": 3, "strength": 5, "heading": 5, "vision": 3, "decision_making": 4}',
 ARRAY['משחק ראש', 'כוח פיזי', 'מנהיגות', 'תיקולים', '1 על 1 הגנתי'],
 ARRAY['מהירות', 'מסירות ארוכות']),

(uid, tid, 'Cristhian Mosquera', 3, 'בלם', NULL, 'בלם מהיר', 'right', 'bench', 'available',
 '{"passing": 3, "dribbling": 3, "finishing": 1, "tackling": 4, "defensive_positioning": 3, "speed": 4, "strength": 3, "heading": 3, "vision": 3, "decision_making": 3}',
 ARRAY['מהירות', 'תיקולים', 'קריאת מסירה'],
 ARRAY['משחק ראש', 'שמירה על מבנה']),

(uid, tid, 'Ben White', 4, 'מגן ימין', 'בלם', 'מגן מכסה', 'right', 'starter', 'available',
 '{"passing": 4, "dribbling": 3, "finishing": 1, "tackling": 4, "defensive_positioning": 4, "speed": 4, "strength": 3, "heading": 3, "vision": 3, "decision_making": 4}',
 ARRAY['מיקום הגנתי', '1 על 1 הגנתי', 'מסירות קצרות', 'משמעת קבוצתית', 'שמירה על מבנה'],
 ARRAY['מסירות ארוכות', 'ריצות עומק']),

(uid, tid, 'Jurriën Timber', 12, 'מגן ימין', 'בלם', 'מגן תומך', 'right', 'starter', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 1, "tackling": 4, "defensive_positioning": 4, "speed": 4, "strength": 3, "heading": 3, "vision": 4, "decision_making": 4}',
 ARRAY['מסירות קצרות', 'דריבלים', 'ראיית משחק', 'מיקום הגנתי'],
 ARRAY['משחק ראש', 'כוח פיזי']),

(uid, tid, 'Oleksandr Zinchenko', 17, 'מגן שמאל', NULL, 'מגן תומך', 'left', 'bench', 'available',
 '{"passing": 5, "dribbling": 4, "finishing": 2, "tackling": 3, "defensive_positioning": 3, "speed": 3, "strength": 2, "heading": 2, "vision": 4, "decision_making": 4}',
 ARRAY['מסירות קצרות', 'ראיית משחק', 'דריבלים', 'משחק בין הקווים', 'פתיחת קווי מסירה'],
 ARRAY['1 על 1 הגנתי', 'כוח פיזי']),

(uid, tid, 'Riccardo Calafiori', 33, 'מגן שמאל', 'בלם', 'מגן תומך', 'left', 'starter', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 2, "tackling": 4, "defensive_positioning": 3, "speed": 4, "strength": 4, "heading": 3, "vision": 3, "decision_making": 3}',
 ARRAY['דריבלים', 'מסירות ארוכות', 'ריצות עומק', 'כוח פיזי'],
 ARRAY['מיקום הגנתי', 'ריכוז לאורך משחק']),

(uid, tid, 'Jakub Kiwior', 15, 'בלם', 'מגן שמאל', 'בלם כיסוי', 'left', 'bench', 'available',
 '{"passing": 4, "dribbling": 3, "finishing": 1, "tackling": 3, "defensive_positioning": 3, "speed": 3, "strength": 3, "heading": 3, "vision": 3, "decision_making": 3}',
 ARRAY['מסירות קצרות', 'שליטה תחת לחץ', 'בנייה משוער'],
 ARRAY['כוח פיזי', 'משחק ראש']),

(uid, tid, 'Myles Lewis-Skelly', 49, 'מגן שמאל', NULL, 'מגן תומך', 'left', 'bench', 'available',
 '{"passing": 3, "dribbling": 4, "finishing": 1, "tackling": 3, "defensive_positioning": 3, "speed": 4, "strength": 3, "heading": 2, "vision": 3, "decision_making": 3}',
 ARRAY['מהירות', 'דריבלים', 'אינטנסיביות', 'יכולת חזרה להגנה'],
 ARRAY['מיקום הגנתי', 'החלטות']);

-- ============ MIDFIELDERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'Martin Ødegaard', 8, 'קשר התקפי', 'קשר מרכזי', 'יוצר משחק', 'left', 'starter', 'available',
 '{"passing": 5, "dribbling": 4, "finishing": 4, "tackling": 2, "defensive_positioning": 2, "speed": 3, "strength": 2, "heading": 2, "vision": 5, "decision_making": 5}',
 ARRAY['מסירות קצרות', 'ראיית משחק', 'החלטות', 'מנהיגות', 'בעיטות'],
 ARRAY['כוח פיזי', 'עבודה הגנתית']),

(uid, tid, 'Declan Rice', 41, 'קשר הגנתי', 'קשר מרכזי', 'בוקס טו בוקס', 'right', 'starter', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 3, "tackling": 4, "defensive_positioning": 4, "speed": 3, "strength": 4, "heading": 3, "vision": 3, "decision_making": 4}',
 ARRAY['תיקולים', 'דריבלים', 'כוח פיזי', 'חיתוך קווי מסירה', 'שמירה על מבנה'],
 ARRAY['מסירות ארוכות', 'קצב משחק']),

(uid, tid, 'Mikel Merino', 23, 'קשר מרכזי', NULL, 'בוקס טו בוקס', 'left', 'starter', 'available',
 '{"passing": 4, "dribbling": 3, "finishing": 3, "tackling": 4, "defensive_positioning": 3, "speed": 3, "strength": 4, "heading": 5, "vision": 3, "decision_making": 4}',
 ARRAY['משחק ראש', 'כוח פיזי', 'הצטרפות מאוחרת לרחבה', 'תזמון יציאה ללחץ'],
 ARRAY['מהירות', 'משחק בין הקווים']),

(uid, tid, 'Martín Zubimendi', 36, 'קשר הגנתי', NULL, 'אנקר הגנתי', 'right', 'starter', 'available',
 '{"passing": 5, "dribbling": 3, "finishing": 2, "tackling": 4, "defensive_positioning": 5, "speed": 3, "strength": 3, "heading": 3, "vision": 5, "decision_making": 5}',
 ARRAY['מיקום הגנתי', 'מסירות קצרות', 'ראיית משחק', 'שליטה תחת לחץ', 'קריאת מסירה'],
 ARRAY['כוח פיזי', 'ריצות עומק']),

(uid, tid, 'Christian Nørgaard', 16, 'קשר הגנתי', NULL, 'אנקר הגנתי', 'right', 'bench', 'available',
 '{"passing": 3, "dribbling": 2, "finishing": 2, "tackling": 4, "defensive_positioning": 4, "speed": 2, "strength": 4, "heading": 4, "vision": 3, "decision_making": 3}',
 ARRAY['תיקולים', 'כוח פיזי', 'משחק ראש', 'אחריות טקטית'],
 ARRAY['מהירות', 'מסירות ארוכות']),

(uid, tid, 'Ethan Nwaneri', 22, 'קשר התקפי', 'קשר מרכזי', 'עשר קלאסי', 'left', 'bench', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 3, "tackling": 2, "defensive_positioning": 2, "speed": 3, "strength": 2, "heading": 2, "vision": 4, "decision_making": 3}',
 ARRAY['דריבלים', 'ראיית משחק', 'מסירות קצרות', 'משחק בין הקווים'],
 ARRAY['כוח פיזי', 'עבודה הגנתית', 'ריכוז לאורך משחק']);

-- ============ FORWARDS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, role, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'Bukayo Saka', 7, 'כנף ימין', NULL, 'כנף חודרני', 'left', 'starter', 'available',
 '{"passing": 4, "dribbling": 5, "finishing": 4, "tackling": 2, "defensive_positioning": 2, "speed": 4, "strength": 3, "heading": 2, "vision": 4, "decision_making": 4}',
 ARRAY['דריבלים', 'מסירות ארוכות', '1 על 1 התקפי', 'עבודה הגנתית', 'בעיטות'],
 ARRAY['משחק ראש', 'כוח פיזי']),

(uid, tid, 'Viktor Gyökeres', 14, 'חלוץ', NULL, 'חלוץ מסיים', 'right', 'starter', 'available',
 '{"passing": 3, "dribbling": 4, "finishing": 5, "tackling": 2, "defensive_positioning": 1, "speed": 4, "strength": 4, "heading": 4, "vision": 3, "decision_making": 4}',
 ARRAY['בעיטות', 'כוח פיזי', 'ריצות עומק', 'תנועה ללא כדור', 'משחק ראש'],
 ARRAY['משחק גב', 'מסירות קצרות']),

(uid, tid, 'Gabriel Martinelli', 11, 'כנף שמאל', NULL, 'כנף חודרני', 'left', 'starter', 'available',
 '{"passing": 3, "dribbling": 4, "finishing": 3, "tackling": 2, "defensive_positioning": 2, "speed": 5, "strength": 3, "heading": 2, "vision": 3, "decision_making": 3}',
 ARRAY['מהירות', 'ריצות עומק', 'אינטנסיביות', 'עבודה הגנתית'],
 ARRAY['בעיטות', 'החלטות', 'ריכוז לאורך משחק']),

(uid, tid, 'Kai Havertz', 29, 'חלוץ', 'קשר התקפי', 'חלוץ נופל', 'left', 'starter', 'available',
 '{"passing": 4, "dribbling": 3, "finishing": 3, "tackling": 2, "defensive_positioning": 2, "speed": 3, "strength": 4, "heading": 4, "vision": 4, "decision_making": 4}',
 ARRAY['משחק ראש', 'תנועה ללא כדור', 'מיקום התקפי', 'הצטרפות מאוחרת לרחבה'],
 ARRAY['בעיטות', 'דריבלים']),

(uid, tid, 'Gabriel Jesus', 9, 'חלוץ', NULL, 'חלוץ נופל', 'right', 'bench', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 3, "tackling": 2, "defensive_positioning": 2, "speed": 4, "strength": 3, "heading": 2, "vision": 3, "decision_making": 3}',
 ARRAY['דריבלים', 'תנועה ללא כדור', 'תגובה לאיבוד כדור', 'משחק בלחץ'],
 ARRAY['בעיטות', 'ריכוז לאורך משחק']),

(uid, tid, 'Leandro Trossard', 19, 'כנף שמאל', 'כנף ימין', 'כנף חותך', 'left', 'bench', 'available',
 '{"passing": 4, "dribbling": 4, "finishing": 4, "tackling": 2, "defensive_positioning": 2, "speed": 3, "strength": 3, "heading": 2, "vision": 3, "decision_making": 4}',
 ARRAY['בעיטות', 'משחק בלחץ', 'קבלת החלטות תחת לחץ', 'מיקום התקפי'],
 ARRAY['מהירות', 'עבודה הגנתית']),

(uid, tid, 'Noni Madueke', 20, 'כנף ימין', NULL, 'כנף חודרני', 'left', 'bench', 'available',
 '{"passing": 3, "dribbling": 5, "finishing": 3, "tackling": 1, "defensive_positioning": 1, "speed": 5, "strength": 2, "heading": 2, "vision": 3, "decision_making": 3}',
 ARRAY['דריבלים', 'מהירות', '1 על 1 התקפי', 'בעיטות'],
 ARRAY['החלטות', 'עבודה הגנתית', 'ריכוז לאורך משחק']);

END $$;
