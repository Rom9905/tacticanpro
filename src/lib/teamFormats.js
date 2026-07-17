/**
 * Multi-format support: 7v7 / 9v9 / 11v11.
 * Single source of truth for per-format formations, pitch layouts,
 * lineup sizes, match durations and AI-context building.
 *
 * Layout coordinates are portrait percentages (x: 0-100 across the
 * pitch width, y: 0-100 down its length) with the goalkeeper at the
 * bottom (y≈92) — matching LineupBuilder and the game-prep PitchView.
 * Each slot carries the Hebrew position name used by PositionRules.
 */

const GK = 'שוער';
const CB = 'בלם';
const RB = 'מגן ימין';
const LB = 'מגן שמאל';
const DM = 'קשר הגנתי';
const CM = 'קשר מרכזי';
const AM = 'קשר התקפי';
const RW = 'כנף ימין';
const LW = 'כנף שמאל';
const ST = 'חלוץ';

// ─── 7v7 layouts (GK + 6) ───
const LAYOUTS_7 = {
  '2-3-1': [
    { x: 50, y: 92, pos: GK },
    { x: 32, y: 74, pos: CB }, { x: 68, y: 74, pos: CB },
    { x: 18, y: 48, pos: LW }, { x: 50, y: 50, pos: CM }, { x: 82, y: 48, pos: RW },
    { x: 50, y: 22, pos: ST },
  ],
  '3-2-1': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 74, pos: LB }, { x: 50, y: 76, pos: CB }, { x: 78, y: 74, pos: RB },
    { x: 35, y: 48, pos: CM }, { x: 65, y: 48, pos: CM },
    { x: 50, y: 22, pos: ST },
  ],
  '2-1-2-1': [
    { x: 50, y: 92, pos: GK },
    { x: 32, y: 76, pos: CB }, { x: 68, y: 76, pos: CB },
    { x: 50, y: 58, pos: DM },
    { x: 28, y: 38, pos: LW }, { x: 72, y: 38, pos: RW },
    { x: 50, y: 20, pos: ST },
  ],
  '3-1-2': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 74, pos: LB }, { x: 50, y: 76, pos: CB }, { x: 78, y: 74, pos: RB },
    { x: 50, y: 52, pos: CM },
    { x: 35, y: 24, pos: ST }, { x: 65, y: 24, pos: ST },
  ],
};

// ─── 9v9 layouts (GK + 8) ───
const LAYOUTS_9 = {
  '3-3-2': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 75, pos: LB }, { x: 50, y: 77, pos: CB }, { x: 78, y: 75, pos: RB },
    { x: 22, y: 50, pos: LW }, { x: 50, y: 52, pos: CM }, { x: 78, y: 50, pos: RW },
    { x: 35, y: 24, pos: ST }, { x: 65, y: 24, pos: ST },
  ],
  '3-2-3': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 75, pos: LB }, { x: 50, y: 77, pos: CB }, { x: 78, y: 75, pos: RB },
    { x: 35, y: 54, pos: CM }, { x: 65, y: 54, pos: CM },
    { x: 20, y: 28, pos: LW }, { x: 50, y: 22, pos: ST }, { x: 80, y: 28, pos: RW },
  ],
  '2-3-2-1': [
    { x: 50, y: 92, pos: GK },
    { x: 32, y: 77, pos: CB }, { x: 68, y: 77, pos: CB },
    { x: 20, y: 56, pos: LW }, { x: 50, y: 58, pos: DM }, { x: 80, y: 56, pos: RW },
    { x: 35, y: 36, pos: AM }, { x: 65, y: 36, pos: AM },
    { x: 50, y: 18, pos: ST },
  ],
  '3-4-1': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 75, pos: LB }, { x: 50, y: 77, pos: CB }, { x: 78, y: 75, pos: RB },
    { x: 15, y: 48, pos: LW }, { x: 38, y: 50, pos: CM }, { x: 62, y: 50, pos: CM }, { x: 85, y: 48, pos: RW },
    { x: 50, y: 22, pos: ST },
  ],
  '2-4-2': [
    { x: 50, y: 92, pos: GK },
    { x: 32, y: 77, pos: CB }, { x: 68, y: 77, pos: CB },
    { x: 15, y: 50, pos: LW }, { x: 38, y: 52, pos: CM }, { x: 62, y: 52, pos: CM }, { x: 85, y: 50, pos: RW },
    { x: 35, y: 24, pos: ST }, { x: 65, y: 24, pos: ST },
  ],
};

// ─── 11v11 layouts (existing formations, slots now labeled) ───
const LAYOUTS_11 = {
  '4-4-2': [
    { x: 50, y: 92, pos: GK },
    { x: 15, y: 75, pos: LB }, { x: 37, y: 75, pos: CB }, { x: 63, y: 75, pos: CB }, { x: 85, y: 75, pos: RB },
    { x: 15, y: 50, pos: LW }, { x: 38, y: 50, pos: CM }, { x: 62, y: 50, pos: CM }, { x: 85, y: 50, pos: RW },
    { x: 35, y: 22, pos: ST }, { x: 65, y: 22, pos: ST },
  ],
  '4-3-3': [
    { x: 50, y: 92, pos: GK },
    { x: 15, y: 75, pos: LB }, { x: 37, y: 75, pos: CB }, { x: 63, y: 75, pos: CB }, { x: 85, y: 75, pos: RB },
    { x: 25, y: 50, pos: CM }, { x: 50, y: 50, pos: DM }, { x: 75, y: 50, pos: CM },
    { x: 18, y: 20, pos: LW }, { x: 50, y: 16, pos: ST }, { x: 82, y: 20, pos: RW },
  ],
  '4-2-3-1': [
    { x: 50, y: 92, pos: GK },
    { x: 15, y: 75, pos: LB }, { x: 37, y: 75, pos: CB }, { x: 63, y: 75, pos: CB }, { x: 85, y: 75, pos: RB },
    { x: 33, y: 57, pos: DM }, { x: 67, y: 57, pos: DM },
    { x: 18, y: 38, pos: LW }, { x: 50, y: 36, pos: AM }, { x: 82, y: 38, pos: RW },
    { x: 50, y: 16, pos: ST },
  ],
  '3-5-2': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 75, pos: CB }, { x: 50, y: 75, pos: CB }, { x: 78, y: 75, pos: CB },
    { x: 10, y: 52, pos: LW }, { x: 30, y: 52, pos: CM }, { x: 50, y: 50, pos: DM }, { x: 70, y: 52, pos: CM }, { x: 90, y: 52, pos: RW },
    { x: 35, y: 22, pos: ST }, { x: 65, y: 22, pos: ST },
  ],
  '3-4-3': [
    { x: 50, y: 92, pos: GK },
    { x: 22, y: 75, pos: CB }, { x: 50, y: 75, pos: CB }, { x: 78, y: 75, pos: CB },
    { x: 15, y: 52, pos: LW }, { x: 40, y: 52, pos: CM }, { x: 60, y: 52, pos: CM }, { x: 85, y: 52, pos: RW },
    { x: 18, y: 20, pos: LW }, { x: 50, y: 16, pos: ST }, { x: 82, y: 20, pos: RW },
  ],
  '5-3-2': [
    { x: 50, y: 92, pos: GK },
    { x: 10, y: 72, pos: LB }, { x: 27, y: 75, pos: CB }, { x: 50, y: 76, pos: CB }, { x: 73, y: 75, pos: CB }, { x: 90, y: 72, pos: RB },
    { x: 25, y: 50, pos: CM }, { x: 50, y: 48, pos: DM }, { x: 75, y: 50, pos: CM },
    { x: 35, y: 22, pos: ST }, { x: 65, y: 22, pos: ST },
  ],
  '5-4-1': [
    { x: 50, y: 92, pos: GK },
    { x: 10, y: 72, pos: LB }, { x: 27, y: 75, pos: CB }, { x: 50, y: 76, pos: CB }, { x: 73, y: 75, pos: CB }, { x: 90, y: 72, pos: RB },
    { x: 15, y: 50, pos: LW }, { x: 38, y: 50, pos: CM }, { x: 62, y: 50, pos: CM }, { x: 85, y: 50, pos: RW },
    { x: 50, y: 18, pos: ST },
  ],
  '4-1-4-1': [
    { x: 50, y: 92, pos: GK },
    { x: 15, y: 75, pos: LB }, { x: 37, y: 75, pos: CB }, { x: 63, y: 75, pos: CB }, { x: 85, y: 75, pos: RB },
    { x: 50, y: 62, pos: DM },
    { x: 12, y: 44, pos: LW }, { x: 35, y: 44, pos: CM }, { x: 65, y: 44, pos: CM }, { x: 88, y: 44, pos: RW },
    { x: 50, y: 18, pos: ST },
  ],
};

export const FORMATS = {
  '7v7': {
    key: '7v7',
    label: '7 על 7',
    lineupSize: 7,
    benchSize: 5,
    halfMinutes: 25,
    formations: Object.keys(LAYOUTS_7),
    defaultFormation: '2-3-1',
    layouts: LAYOUTS_7,
  },
  '9v9': {
    key: '9v9',
    label: '9 על 9',
    lineupSize: 9,
    benchSize: 7,
    halfMinutes: 30,
    formations: Object.keys(LAYOUTS_9),
    defaultFormation: '3-3-2',
    layouts: LAYOUTS_9,
  },
  '11v11': {
    key: '11v11',
    label: '11 על 11',
    lineupSize: 11,
    benchSize: 9,
    halfMinutes: 45,
    formations: Object.keys(LAYOUTS_11),
    defaultFormation: '4-4-2',
    layouts: LAYOUTS_11,
  },
};

export const FORMAT_KEYS = ['7v7', '9v9', '11v11'];

export const FORMATION_DESCRIPTIONS = {
  // 7v7
  '2-3-1': 'בסיס קלאסי ל-7 על 7 — רוחב ואיזון',
  '3-2-1': 'יציבות הגנתית — משולש אחורי חזק',
  '2-1-2-1': 'יהלום — שליטה במרכז ומעברים',
  '3-1-2': 'שני חלוצים — נוכחות קדמית',
  // 9v9
  '3-3-2': 'בסיס קלאסי ל-9 על 9 — שלוש שכבות',
  '3-2-3': 'רוחב התקפי — שלושה קדמיים',
  '2-3-2-1': 'שליטה במרכז — עומק בשכבות',
  '3-4-1': 'קו אמצע רחב — שליטה באגפים',
  '2-4-2': 'התקפי — ארבעה באמצע ושני חלוצים',
  // 11v11
  '4-4-2': 'מערך מאוזן קלאסי - מתאים למשחק ישיר',
  '4-3-3': 'מערך התקפי עם שליטה ברוחב',
  '4-2-3-1': 'מערך גמיש עם קשר עשר',
  '3-5-2': 'שליטה באמצע + גמישות בצד',
  '3-4-3': 'מערך אגרסיבי עם לחץ גבוה',
  '5-3-2': 'מערך הגנתי עם יציבות',
  '5-4-1': 'הגנה עמוקה + קונטרה',
  '4-1-4-1': 'עוגן הגנתי + רוחב התקפי',
};

// ─── helpers ───

export function getFormat(teamOrKey) {
  const key = typeof teamOrKey === 'string' ? teamOrKey : teamOrKey?.format;
  return FORMATS[key] || FORMATS['11v11'];
}

export function formationsFor(teamOrKey) {
  return getFormat(teamOrKey).formations;
}

export function lineupSizeFor(teamOrKey) {
  return getFormat(teamOrKey).lineupSize;
}

export function layoutFor(teamOrKey, formation) {
  const fmt = getFormat(teamOrKey);
  return fmt.layouts[formation] || fmt.layouts[fmt.defaultFormation];
}

export function positionMappingFor(teamOrKey, formation) {
  const layout = layoutFor(teamOrKey, formation);
  const map = {};
  layout.forEach((slot, i) => { map[i] = slot.pos; });
  return map;
}

// Small-sided formats are youth football in the Israeli leagues.
export function isYouthFormat(teamOrKey) {
  return getFormat(teamOrKey).key !== '11v11';
}

// Kids mode drives the development-first analysis tone.
export function isKidsTeam(team) {
  if (!team) return false;
  return team.age_group === 'ילדים' || isYouthFormat(team);
}

export function matchDurationFor(teamOrKey) {
  const fmt = getFormat(teamOrKey);
  return { halves: 2, halfMinutes: fmt.halfMinutes, total: fmt.halfMinutes * 2 };
}

export function formatBadgeLabel(team) {
  const fmt = getFormat(team);
  return team?.age_group ? `${fmt.label} | ${team.age_group}` : fmt.label;
}

/**
 * Hebrew context block appended to AI prompts. Kids teams get an
 * explicit development-first instruction; senior teams keep the
 * full tactical depth.
 */
export function buildFormatAIContext(team) {
  if (!team) return '';
  const fmt = getFormat(team);
  const age = team.age_group || '';
  const lines = [
    '',
    `--- הקשר קבוצה ---`,
    `פורמט משחק: ${fmt.label} (${fmt.lineupSize} שחקנים בהרכב, שני חצאים של ${fmt.halfMinutes} דקות)${age ? ` | קבוצת גיל: ${age}` : ''}`,
  ];
  if (isKidsTeam(team)) {
    lines.push(
      `זו קבוצת ילדים/נוער צעיר בפורמט קטן. הניתוח חייב להתמקד בפיתוח ולא בתוצאה:`,
      `- עקרונות בסיס בלבד: מיצוב, רוחב, אומץ עם הכדור, מגעים בכדור, הצלחות 1 על 1.`,
      `- טון של מנטור חם ומעודד. הדגש הצלחות לפני בעיות.`,
      `- זכור מודעות לזמן משחק שווה לכל הילדים.`,
      `- אל תשתמש במושגים של כדורגל בוגרים: בלוק נמוך, PPDA, xG, מבני לחץ מורכבים.`
    );
  } else {
    lines.push(`קבוצה בוגרת/נוער — שמור על עומק טקטי מלא (לחץ, בנייה, בלוקים, מעברים).`);
  }
  return lines.join('\n');
}
