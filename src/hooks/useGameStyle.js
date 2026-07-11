import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useGameStyle — מחזיר שיטת המשחק של קבוצה נתונה
 * משתמש ב-cache פשוט לפי teamId
 */
const cache = {};

export function useGameStyle(teamId) {
  const [gameStyle, setGameStyle] = useState(cache[teamId]?.gameStyle || null);
  const [gameStyleNotes, setGameStyleNotes] = useState(cache[teamId]?.notes || '');

  useEffect(() => {
    if (!teamId) return;
    if (cache[teamId]) {
      setGameStyle(cache[teamId].gameStyle);
      setGameStyleNotes(cache[teamId].notes);
      return;
    }
    base44.entities.Team.filter({ id: teamId }).then(data => {
      const team = data[0];
      if (team) {
        cache[teamId] = { gameStyle: team.game_style || null, notes: team.game_style_notes || '' };
        setGameStyle(cache[teamId].gameStyle);
        setGameStyleNotes(cache[teamId].notes);
      }
    });
  }, [teamId]);

  return { gameStyle, gameStyleNotes };
}

/**
 * buildGameStyleContext — בונה טקסט הקשר לשימוש ב-AI prompts
 */
const LABELS = {
  buildup: 'בניית משחק',
  tempo: 'קצב משחק',
  width: 'רוחב משחק',
  depth: 'יצירת עומק',
  attack_focus: 'מיקוד התקפי',
  finishing_style: 'סגנון סיומת',
  defensive_line: 'קו הגנה',
  defensive_style: 'סגנון הגנה',
  players_behind_ball: 'שחקנים מאחורי הכדור',
  marking_style: 'שמירה',
  press_on_ball: 'לחץ על בעל הכדור',
  set_piece_defense: 'הגנה על מצבי נייחים',
  recovery_response: 'תגובה לאחר החזרת כדור',
  transition_players: 'שחקנים במעבר התקפי',
  transition_direction: 'כיוון מועדף במעבר',
  loss_response: 'תגובה לאחר אובדן',
  press_zone: 'אזור תחילת לחץ',
  reorganize_time: 'זמן חזרה לארגון',
};

export function buildGameStyleContext(gameStyle, gameStyleNotes) {
  if (!gameStyle || Object.keys(gameStyle).length === 0) return '';
  const lines = Object.entries(gameStyle)
    .filter(([k, v]) => v && LABELS[k])
    .map(([k, v]) => `- ${LABELS[k]}: ${v}`);
  if (lines.length === 0) return '';
  let ctx = `\n\n=== שיטת המשחק שהוגדרה על ידי המאמן ===\n${lines.join('\n')}`;
  if (gameStyleNotes) ctx += `\nהערות מאמן: ${gameStyleNotes}`;
  ctx += `\n\nחשוב: השווה את הביצוע בפועל לשיטה שהוגדרה. כל פער בין השיטה לביצוע יסומן בכותרת "על בסיס שיטת המשחק שהגדרת —" ואז הבעיה הספציפית.`;
  return ctx;
}

/**
 * getTrainingRecommendationsFromGameStyle — מחזיר המלצות אימון לפי שיטת משחק
 */
export function getTrainingRecommendationsFromGameStyle(gameStyle) {
  if (!gameStyle) return [];
  const recs = [];

  if (gameStyle.defensive_style?.includes('לחץ אגרסיבי גבוה')) {
    recs.push('לחץ מתואם — טריגרים ללחץ ועבודה ללא כדור');
  }
  if (gameStyle.buildup?.includes('מהשוער')) {
    recs.push('יציאות קצרות — משולשי בנייה ותקשורת שוער-מגנים');
  }
  if (gameStyle.recovery_response?.includes('מהיר')) {
    recs.push('מעברים מהירים — ראיית שחקנים פנויים ומהירות קבלת החלטות');
  }
  if (gameStyle.defensive_line?.includes('גבוה')) {
    recs.push('ניהול קו הגנה גבוה — מלכודת נבדל ותיאום עומק');
  }
  if (gameStyle.finishing_style?.includes('הגבהות')) {
    recs.push('הגבהות מהצדדים — כניסות לרוחב ועמדות בתוך הרחבה');
  }
  if (gameStyle.buildup?.includes('ישיר') || gameStyle.tempo?.includes('מהיר')) {
    recs.push('משחק ישיר מהיר — כדורים לעומק וסיום מהיר');
  }
  if (gameStyle.width?.includes('רחב')) {
    recs.push('פתיחת רוחב — עבודת כנפות וחדירות מהצדדים');
  }
  if (gameStyle.loss_response?.includes('לחץ מיידי')) {
    recs.push('לחץ לאחר אובדן — תגובה מיידית ואגרסיבית');
  }

  return recs;
}