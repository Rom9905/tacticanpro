-- =============================================
-- Arsenal FC 2025/26 Squad
-- Run in Supabase SQL Editor
-- =============================================

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

-- 2. Insert players
-- Helper variable
DO $$
DECLARE
  tid UUID := 'a1b2c3d4-0001-4000-a000-000000000001';
  uid UUID := 'c8633898-5dd6-4695-a540-35240cdf6fe0';
BEGIN

-- ============ GOALKEEPERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'David Raya', 1, 'GK', 'right', 'starter', 'available',
 '{"overall": 86, "reflexes": 88, "distribution": 85, "positioning": 84, "command_of_area": 83}',
 ARRAY['רפלקסים מהירים', 'משחק ברגליים מצוין', 'עצירות אחד על אחד', 'בניית משחק מאחור'],
 ARRAY['קרוסים גבוהים', 'תקשורת עם ההגנה']),

(uid, tid, 'Kepa Arrizabalaga', 13, 'GK', 'right', 'bench', 'available',
 '{"overall": 78, "reflexes": 80, "distribution": 79, "positioning": 76, "command_of_area": 75}',
 ARRAY['עצירות פנדלים', 'משחק ברגליים', 'ניסיון בינלאומי'],
 ARRAY['עקביות', 'יציאה לכדורים גבוהים']),

(uid, tid, 'Karl Hein', 31, 'GK', 'right', 'reserve', 'available',
 '{"overall": 68, "reflexes": 70, "distribution": 67, "positioning": 66, "command_of_area": 65}',
 ARRAY['צעיר ומתפתח', 'רפלקסים טובים', 'גובה'],
 ARRAY['ניסיון חסר', 'משחק ברגליים']);

-- ============ DEFENDERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'William Saliba', 2, 'CB', NULL, 'right', 'starter', 'available',
 '{"overall": 88, "defending": 90, "physical": 86, "passing": 78, "pace": 80, "aerial": 88}',
 ARRAY['קריאת משחק יוצאת דופן', 'דו-קרבות אוויריים', 'קור רוח תחת לחץ', 'מהירות לבלם'],
 ARRAY['פסים ארוכים יצירתיים', 'תרומה התקפית']),

(uid, tid, 'Gabriel Magalhães', 6, 'CB', NULL, 'left', 'starter', 'available',
 '{"overall": 86, "defending": 88, "physical": 87, "passing": 74, "pace": 72, "aerial": 90}',
 ARRAY['דו-קרבות אוויריים', 'גולים מקרנות', 'עוצמה פיזית', 'מנהיגות הגנתית'],
 ARRAY['מהירות בריצה לאחור', 'טעויות מדי פעם בבנייה']),

(uid, tid, 'Cristhian Mosquera', 3, 'CB', NULL, 'right', 'bench', 'available',
 '{"overall": 76, "defending": 78, "physical": 77, "passing": 74, "pace": 78, "aerial": 75}',
 ARRAY['מהירות לבלם צעיר', 'קריאת משחק', 'יכולת בנייה מאחור'],
 ARRAY['ניסיון בליגה האנגלית', 'עקביות']),

(uid, tid, 'Ben White', 4, 'RB', 'CB', 'right', 'starter', 'available',
 '{"overall": 84, "defending": 83, "physical": 78, "passing": 82, "pace": 80, "dribbling": 79}',
 ARRAY['רב-תכליתיות עמדות', 'הגנה אחד על אחד', 'בנייה מאחור', 'משמעת טקטית'],
 ARRAY['תרומה התקפית מצומצמת', 'צלבות']),

(uid, tid, 'Jurriën Timber', 12, 'RB', 'CB', 'right', 'starter', 'available',
 '{"overall": 83, "defending": 82, "physical": 79, "passing": 81, "pace": 82, "dribbling": 80}',
 ARRAY['רב-תכליתיות', 'אינטליגנציה טקטית', 'כיסוי מהיר', 'משחק קצר'],
 ARRAY['עמידות פציעות', 'דו-קרבות אוויריים']),

(uid, tid, 'Oleksandr Zinchenko', 17, 'LB', NULL, 'left', 'bench', 'available',
 '{"overall": 80, "defending": 72, "physical": 70, "passing": 86, "pace": 72, "dribbling": 80}',
 ARRAY['בנייה מאחור', 'יצירתיות', 'חדירה למרכז המגרש', 'חזון משחק'],
 ARRAY['הגנה אחד על אחד', 'עוצמה פיזית']),

(uid, tid, 'Riccardo Calafiori', 33, 'LB', 'CB', 'left', 'starter', 'available',
 '{"overall": 82, "defending": 80, "physical": 81, "passing": 80, "pace": 79, "dribbling": 78}',
 ARRAY['נשיאת כדור קדימה', 'רב-תכליתיות', 'תרומה התקפית', 'פסים פרוגרסיביים'],
 ARRAY['עקביות הגנתית', 'הסתגלות לליגה']),

(uid, tid, 'Jakub Kiwior', 15, 'CB', 'LB', 'left', 'bench', 'available',
 '{"overall": 76, "defending": 77, "physical": 74, "passing": 76, "pace": 74, "aerial": 75}',
 ARRAY['משחק ברגל שמאל', 'רב-תכליתיות', 'בנייה מאחור'],
 ARRAY['עוצמה פיזית', 'דו-קרבות אוויריים']),

(uid, tid, 'Myles Lewis-Skelly', 49, 'LB', NULL, 'left', 'bench', 'available',
 '{"overall": 72, "defending": 70, "physical": 74, "passing": 73, "pace": 80, "dribbling": 75}',
 ARRAY['מהירות', 'נשיאת כדור', 'צעיר ואמיץ', 'אנרגיה'],
 ARRAY['ניסיון', 'קבלת החלטות הגנתית']);

-- ============ MIDFIELDERS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'Martin Ødegaard', 8, 'CAM', 'CM', 'left', 'starter', 'available',
 '{"overall": 89, "passing": 92, "dribbling": 87, "shooting": 80, "vision": 93, "pace": 74}',
 ARRAY['יצירתיות יוצאת דופן', 'פסים מפתח', 'חזון משחק', 'מנהיגות', 'כדורים עומדים'],
 ARRAY['עוצמה פיזית', 'הגנה']),

(uid, tid, 'Declan Rice', 41, 'CDM', 'CM', 'right', 'starter', 'available',
 '{"overall": 87, "defending": 85, "physical": 86, "passing": 82, "dribbling": 80, "shooting": 74}',
 ARRAY['יירוטים', 'נשיאת כדור מהעומק', 'עוצמה פיזית', 'כיסוי שטחים', 'רב-תכליתיות'],
 ARRAY['יצירתיות בשליש האחרון', 'טמפו משחק']),

(uid, tid, 'Mikel Merino', 23, 'CM', NULL, 'left', 'starter', 'available',
 '{"overall": 83, "defending": 78, "physical": 84, "passing": 82, "aerial": 85, "dribbling": 76}',
 ARRAY['דו-קרבות אוויריים', 'עוצמה פיזית', 'גולים מהקו השני', 'לחץ גבוה'],
 ARRAY['מהירות', 'משחק בין הקווים']),

(uid, tid, 'Martín Zubimendi', 36, 'CDM', NULL, 'right', 'starter', 'available',
 '{"overall": 85, "defending": 83, "passing": 87, "physical": 78, "vision": 86, "positioning": 88}',
 ARRAY['קריאת משחק', 'פסים מדויקים', 'מיקום הגנתי', 'שליטה בקצב', 'קור רוח תחת לחץ'],
 ARRAY['עוצמה פיזית', 'תרומה התקפית']),

(uid, tid, 'Christian Nørgaard', 16, 'CDM', NULL, 'right', 'bench', 'available',
 '{"overall": 77, "defending": 80, "physical": 82, "passing": 74, "aerial": 81, "pace": 68}',
 ARRAY['דו-קרבות', 'עוצמה פיזית', 'ניסיון', 'עבודה קשה'],
 ARRAY['מהירות', 'יצירתיות']),

(uid, tid, 'Ethan Nwaneri', 22, 'CAM', 'CM', 'left', 'bench', 'available',
 '{"overall": 74, "passing": 78, "dribbling": 79, "shooting": 73, "vision": 77, "pace": 76}',
 ARRAY['כישרון טבעי', 'כדרור', 'חזון משחק', 'בשלות לגיל צעיר'],
 ARRAY['עוצמה פיזית', 'עקביות', 'ניסיון']);

-- ============ FORWARDS ============

INSERT INTO public.players (user_id, team_id, name, number, position, position_secondary, dominant_foot, squad_status, availability, skill_ratings, strengths, improvements)
VALUES
(uid, tid, 'Bukayo Saka', 7, 'RW', NULL, 'left', 'starter', 'available',
 '{"overall": 89, "dribbling": 88, "passing": 85, "shooting": 83, "pace": 86, "crossing": 87}',
 ARRAY['כדרור', 'צלבות מדויקות', 'יצירת מצבים', 'עקביות ברמה גבוהה', 'תרומה הגנתית'],
 ARRAY['רגל ימין', 'פציעות חוזרות']),

(uid, tid, 'Viktor Gyökeres', 14, 'ST', 'CF', 'right', 'starter', 'available',
 '{"overall": 87, "shooting": 89, "physical": 86, "pace": 84, "dribbling": 80, "heading": 82}',
 ARRAY['סיום קר', 'עוצמה פיזית', 'ריצות עומק', 'גולים מכל מצב', 'לחץ על הגנה'],
 ARRAY['משחק גב לשער', 'פסים יצירתיים']),

(uid, tid, 'Gabriel Martinelli', 11, 'LW', NULL, 'left', 'starter', 'available',
 '{"overall": 82, "pace": 88, "dribbling": 83, "shooting": 78, "physical": 76, "passing": 74}',
 ARRAY['מהירות מתפרצת', 'ריצות לעומק', 'אנרגיה', 'עבודה הגנתית'],
 ARRAY['סיום', 'קבלת החלטות בשליש האחרון', 'עקביות']),

(uid, tid, 'Kai Havertz', 29, 'CF', 'CAM', 'left', 'starter', 'available',
 '{"overall": 83, "shooting": 80, "passing": 81, "physical": 82, "aerial": 84, "dribbling": 79}',
 ARRAY['רב-תכליתיות', 'משחק אווירי', 'תנועה חכמה', 'מיקום בתיבה'],
 ARRAY['עקביות בסיום', 'עוצמה פיזית בדו-קרבות']),

(uid, tid, 'Gabriel Jesus', 9, 'CF', 'ST', 'right', 'bench', 'available',
 '{"overall": 80, "dribbling": 83, "shooting": 78, "passing": 79, "pace": 80, "physical": 74}',
 ARRAY['לחץ גבוה', 'כדרור', 'משחק קישור', 'תנועה ללא כדור'],
 ARRAY['סיום מצבים נקיים', 'פציעות חוזרות']),

(uid, tid, 'Leandro Trossard', 19, 'LW', 'RW', 'left', 'bench', 'available',
 '{"overall": 81, "shooting": 82, "dribbling": 80, "passing": 79, "pace": 78, "finishing": 83}',
 ARRAY['סיום מדויק', 'רב-תכליתיות', 'אימפקט מהספסל', 'ניסיון'],
 ARRAY['מהירות מקסימלית', 'הגנה']),

(uid, tid, 'Noni Madueke', 20, 'RW', NULL, 'left', 'bench', 'available',
 '{"overall": 80, "dribbling": 84, "pace": 86, "shooting": 78, "passing": 74, "physical": 72}',
 ARRAY['כדרור מהיר', 'חדירות אחד על אחד', 'מהירות', 'יכולת בועט'],
 ARRAY['עקביות', 'קבלת החלטות', 'תרומה הגנתית']);

END $$;
