// Central map: Hebrew DB values → English display labels
// Used everywhere data was saved in Hebrew and needs to display in English

export const POSITION_MAP = {
  'שוער': 'Goalkeeper',
  'בלם': 'Centre-Back',
  'מגן ימין': 'Right Back',
  'מגן שמאל': 'Left Back',
  'קשר הגנתי': 'Defensive Mid',
  'קשר מרכזי': 'Central Mid',
  'קשר התקפי': 'Attacking Mid',
  'כנף ימין': 'Right Wing',
  'כנף שמאל': 'Left Wing',
  'חלוץ': 'Striker',
};

export const AVAILABILITY_MAP = {
  'זמין': 'Available',
  'פצוע': 'Injured',
  'מושעה': 'Suspended',
  'לא זמין': 'Unavailable',
};

export const SQUAD_STATUS_MAP = {
  'הרכב': 'Starter',
  'רוטציה': 'Rotation',
  'ספסל': 'Bench',
  'נוער': 'Youth',
};

export const PROFESSIONAL_STATUS_MAP = {
  'בהתקדמות': 'Progressing',
  'יציב': 'Stable',
  'בירידה': 'Declining',
};

export const DOMINANT_FOOT_MAP = {
  'ימין': 'Right',
  'שמאל': 'Left',
  'שתיהן': 'Both',
};

export const ROLE_MAP = {
  'שוער יוזם': 'Sweeper Keeper',
  'שוער שומר': 'Shot-Stopper',
  'בלם מוביל': 'Ball-Playing CB',
  'בלם כיסוי': 'Cover CB',
  'בלם מהיר': 'Aggressive CB',
  'מגן תומך': 'Inverted FB',
  'מגן מכסה': 'Wingback',
  'אנקר הגנתי': 'Defensive Anchor',
  'קשר מאזן': 'Holding Mid',
  'קשר מחבר': 'Deep Playmaker',
  'קשר עמוק': 'Deep Lying Mid',
  'בוקס טו בוקס': 'Box-to-Box Mid',
  'יוצר משחק': 'Playmaker',
  'עשר קלאסי': 'Classic No.10',
  'כנף רחב': 'Wide Winger',
  'כנף חודרני': 'Inside Forward',
  'כנף חותך': 'Inverted Winger',
  'חלוץ מסיים': 'Poacher',
  'חלוץ מטרה': 'Target Man',
  'חלוץ נופל': 'False 9',
  'שני חודים': 'Second Striker',
};

export const PLAYING_STYLE_MAP = {
  'התקפי': 'Attacking',
  'מאוזן': 'Balanced',
  'הגנתי': 'Defensive',
  'החזקת כדור': 'Possession',
  'קונטרה': 'Counter-Attack',
};

export const AGE_GROUP_MAP = {
  'ילדים': 'Children',
  'נערים': 'Youth',
  'נוער': 'Juniors',
  'בוגרים': 'Adults',
};

export const SKILL_MAP = {
  // Field skills
  'מהירות': 'Speed',
  'כוח פיזי': 'Physical Strength',
  'סיבולת': 'Stamina',
  'שליטה תחת לחץ': 'Composure Under Pressure',
  'דריבלים': 'Dribbling',
  'מסירות קצרות': 'Short Passing',
  'מסירות ארוכות': 'Long Passing',
  'בעיטות': 'Shooting',
  'משחק ראש': 'Heading',
  'תיקולים': 'Tackling',
  'קריאת מסירה': 'Reading Passes',
  'חיתוך קווי מסירה': 'Intercepting Pass Lines',
  'מיקום הגנתי': 'Defensive Positioning',
  'מיקום התקפי': 'Attacking Positioning',
  'ראיית משחק': 'Vision',
  'החלטות': 'Decision Making',
  'מנהיגות': 'Leadership',
  'ריכוז': 'Concentration',
  'ריצות עומק': 'Runs Behind',
  '1 על 1 התקפי': '1v1 Attacking',
  '1 על 1 הגנתי': '1v1 Defending',
  'משחק גב': 'Back to Goal',
  'בנייה משוער': 'Build-up from GK',
  'תנועה ללא כדור': 'Movement Off Ball',
  'משחק בלחץ': 'Playing Under Pressure',
  'עבודה הגנתית': 'Defensive Work Rate',
  'קבלת החלטות תחת לחץ': 'Decision Under Pressure',
  'זיהוי יתרון מספרי': 'Numerical Advantage Recognition',
  'שמירה על מבנה': 'Maintaining Shape',
  'תזמון יציאה ללחץ': 'Press Timing',
  'תגובה לאיבוד כדור': 'Reaction to Ball Loss',
  'הגנה על חצי מרחב': 'Half-Space Defense',
  'סגירת קו מסירה אחורי': 'Blocking Back Pass Lines',
  'שמירה באחד על אחד': '1v1 Marking',
  'חיפוי הגנתי': 'Defensive Cover',
  'פתיחת קווי מסירה': 'Opening Pass Lines',
  'משחק בין הקווים': 'Between the Lines',
  'הצטרפות מאוחרת לרחבה': 'Late Box Runs',
  'אחריות טקטית': 'Tactical Responsibility',
  'ריכוז לאורך משחק': 'Focus Throughout Match',
  'תגובה לטעויות': 'Mistake Recovery',
  'משמעת קבוצתית': 'Team Discipline',
  'אינטנסיביות': 'Intensity',
  'קצב משחק': 'Game Pace',
  'יכולת חזרה להגנה': 'Recovery Runs',
  'עמידות בעומס משחק': 'Workload Resistance',
  // Goalkeeper skills
  'רפלקסים': 'Reflexes',
  'עצירות קו': 'Shot Stopping',
  'אחד על אחד': 'One-on-One',
  'יציאה לכדורי גובה': 'Claiming High Balls',
  'מיקום': 'Positioning',
  'תזמון יציאה': 'Coming Out Timing',
  'שליטה ברחבה': 'Box Control',
  'מסירה קצרה': 'Short Distribution',
  'מסירה ארוכה/דיוק פתיחה': 'Long Distribution',
  'זריזות': 'Agility',
  'קפיצה': 'Jumping',
  'כוח גוף': 'Physical Strength',
  'תקשורת עם ההגנה': 'Communication with Defense',
  'הפצה מהירה': 'Quick Distribution',
  'קריאת המשחק': 'Reading the Game',
  'אומץ': 'Bravery',
  'עמידות בלחץ': 'Pressure Resistance',
};

export const PRIORITY_MAP = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

export const TACTICAL_CATEGORY_MAP = {
  'התקפה': 'Attack',
  'הגנה': 'Defense',
  'מעברים': 'Transitions',
  'מצבים נייחים': 'Set Pieces',
  'לחץ': 'Pressing',
  'כללי': 'General',
};

export const TACTICAL_TOPIC_MAP = {
  'לחץ גבוה': 'High Press',
  'בנייה מהגנה': 'Build from Defense',
  'מעברים התקפיים': 'Attacking Transitions',
  'מעברים הגנתיים': 'Defensive Transitions',
  'תיאום הגנתי': 'Defensive Shape',
  'מצבים נייחים': 'Set Pieces',
  'שחקן נגד שחקן': '1v1 Marking',
  'שליטה במרכז': 'Midfield Control',
  'הגנה ארגונית': 'Organized Defense',
  'בנייה מהלחץ': 'Build under Press',
  'יציאה מלחץ': 'Press Escape',
  'משחק אורכי': 'Long Game',
  'כדורים גבוהים': 'Aerial Balls',
  // ProfessionalSummary tactical topics
  'לחץ גבוה': 'High Press',
  'בנייה מהגנה': 'Build from Defense',
  'מעברים התקפיים': 'Attacking Transitions',
  'מעברים הגנתיים': 'Defensive Transitions',
  'תיאום הגנתי': 'Defensive Coordination',
  'שחקן נגד שחקן': '1v1 Marking',
  'שליטה במרכז': 'Midfield Control',
  'הגנה ארגונית': 'Organized Defense',
  'בנייה מהלחץ': 'Build Under Pressure',
  'יציאה מלחץ': 'Press Escape',
  'משחק אורכי': 'Long Game',
  'כדורים גבוהים': 'High Balls',
  'שליטה בכדור': 'Ball Control',
  'הגנה על חצי מרחב': 'Half-Space Defense',
  'שליטה בקצב': 'Tempo Control',
  'כדורים גבוהים': 'High Balls',
};

export const SITUATION_CATEGORY_MAP = {
  'בנייה מהגנה': 'Build-up from Defense',
  'מעבר הגנתי': 'Defensive Transition',
  'מעבר התקפי': 'Attacking Transition',
  'לחץ': 'Pressing',
  'שליש אחרון': 'Final Third',
  'כדור קבוע': 'Set Pieces',
  'קונטרה': 'Counter-Attack',
  'אובדן כדור': 'Ball Loss',
  'ניהול משחק': 'Game Management',
};

/** Translate a Hebrew value using a provided map, fallback to original */
export function tr(map, value) {
  if (!value) return value;
  return map[value] || value;
}

/** Translate an array of Hebrew values */
export function trArr(map, arr) {
  if (!arr) return arr;
  return arr.map(v => tr(map, v));
}