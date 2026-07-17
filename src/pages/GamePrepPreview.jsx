// Dev-only preview of the game-prep screens so they can be reviewed (esp. on
// mobile) without logging in. Renders the real components with mock data.
// Public route registered in App.jsx before the auth gate.
import React, { useState } from 'react';
import { objectFingerprint } from '@/lib/analysisFingerprint';
import MatchdayHub from '@/components/gameprep/MatchdayHub';
import GamePrepForm from '@/components/gameprep/GamePrepForm';

const players = [
  { id: 'p1', name: 'רועי לוי', number: 1, position: 'שוער' },
  { id: 'p2', name: 'דן כהן', number: 2, position: 'מגן ימני' },
  { id: 'p3', name: 'איתי בר', number: 4, position: 'בלם' },
  { id: 'p4', name: 'עומר גל', number: 5, position: 'בלם' },
  { id: 'p5', name: 'נדב אור', number: 3, position: 'מגן שמאלי' },
  { id: 'p6', name: 'יונתן שי', number: 6, position: 'קשר הגנתי' },
  { id: 'p7', name: 'אלון דוד', number: 8, position: 'קשר' },
  { id: 'p8', name: 'גיא רון', number: 10, position: 'קשר התקפי' },
  { id: 'p9', name: 'תום ניר', number: 7, position: 'כנף ימנית' },
  { id: 'p10', name: 'עידו פז', number: 9, position: 'חלוץ' },
  { id: 'p11', name: 'שגיא לב', number: 11, position: 'כנף שמאלית' },
  { id: 'p12', name: 'אורי מור', number: 14, position: 'קשר' },
];

const lineup = players.slice(0, 11).map(p => p.id);

const mk = (opponent, formation, style, our, opp) => ({
  id: `m-${opponent}-${our}${opp}`,
  opponent,
  opponent_formation: formation,
  opponent_attack_style: style,
  date: '2026-05-01',
  result: { our_score: our, opponent_score: opp },
});

const matchAnalyses = [
  mk('הפועל דרום', '4-3-3', 'לחץ גבוה', 3, 1),
  mk('מכבי צפון', '4-3-3', 'לחץ גבוה', 2, 2),
  mk('בני מזרח', '4-3-3', 'לחץ גבוה', 1, 0),
  mk('עירוני מרכז', '4-4-2', 'כדורים ארוכים', 0, 2),
  mk('מ.ס. גליל', '4-4-2', 'כדורים ארוכים', 1, 1),
  mk('הכוח עמק', '4-2-3-1', 'בנייה מהגנה', 2, 0),
  mk('שמשון', '4-2-3-1', 'בנייה מהגנה', 0, 1),
  mk('איחוד', '3-5-2', 'התקפה מהצדדים', 4, 2),
];

const basePrep = {
  id: 'prep-1',
  team_id: 'team-1',
  prep_type: 'opponent',
  name: 'הכנה מול מכבי צפון',
  opponent_name: 'מכבי צפון',
  date: '2026-07-20',
  match_time: '20:00',
  opponent_formation: '4-3-3',
  opponent_attack_style: 'לחץ גבוה',
  opponent_defense_style: 'בלוק גבוה',
  opponent_strength_level: 'חזק',
  opponent_key_strength: 'לחץ אגרסיבי מיד לאחר איבוד כדור, במיוחד באגף ימין.',
  opponent_key_weakness: 'הבלמים איטיים בסיבוב — פגיעים לכדורי עומק מאחורי קו ההגנה.',
  opponent_dangerous_players: 'מס\' 10 — קשר יוצר, מנהל את כל המהלכים. מס\' 9 — חלוץ מהיר.',
  opponent_patterns: 'מסירת פתיחה קצרה מהשוער, בנייה דרך הקשר האחורי, מעברים מהירים לאגפים.',
  recommended_lineup: lineup,
};

const analysis = {
  mission: 'לנצל את האיטיות של הבלמים בכדורי עומק, ולנטרל את מספר 10 עם צמצום המרחבים במרכז.',
  offensive_points: [
    'להעביר כדורי עומק מוקדם מאחורי קו ההגנה — הבלמים איטיים בסיבוב.',
    'לתקוף דרך אגף שמאל, מול המגן הימני שנוטה לעלות גבוה.',
    'לחפש את החלוץ בין הקווים כשהקשר האחורי שלהם נמשך החוצה.',
  ],
  defensive_points: [
    'לצמצם מרחבים למספר 10 — קשר קרוב שיסמן אותו לאורך כל המשחק.',
    'להיזהר מהמעברים המהירים לאגפים אחרי איבוד כדור.',
    'לשמור על קו הגנה גבוה אך מסונכרן כדי לא לתת עומק לחלוץ המהיר.',
  ],
  training_topics: [
    'מעבר הגנה מהיר אחרי איבוד כדור באגף',
    'כדורי עומק מדויקים מהקשר האחורי',
    'סימון אזור מול קשר יוצר',
  ],
  full_narrative:
    'מכבי צפון היא קבוצה שחיה על אנרגיה ולחץ. הם ינסו לחנוק אותנו גבוה ולהוציא אותנו מאיזון מוקדם. ' +
    'המפתח הוא לא להיבהל מהלחץ הראשוני — לשחק בסבלנות, למשוך אותם קדימה, ואז לפגוע במרחבים שהם משאירים מאחור. ' +
    'מספר 10 שלהם הוא הראש של הקבוצה; אם ננטרל אותו, כל המנגנון שלהם מאבד קצב. ' +
    'זה משחק של משמעת טקטית וניצול רגעים — בדיוק הסוג שאנחנו בנויים אליו.',
};

analysis.fingerprint = objectFingerprint({
  formation: basePrep.opponent_formation, attack: basePrep.opponent_attack_style,
  defense: basePrep.opponent_defense_style, strength: basePrep.opponent_strength_level,
  keyStrength: basePrep.opponent_key_strength, keyWeakness: basePrep.opponent_key_weakness,
  dangerous: basePrep.opponent_dangerous_players, patterns: basePrep.opponent_patterns,
});

const prep = { ...basePrep, ai_analysis: analysis };

export default function GamePrepPreview() {
  const [tab, setTab] = useState('hub');

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '8px 16px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
        border: 'none', cursor: 'pointer',
        background: tab === id ? '#16A34A' : 'rgba(13,26,18,.08)',
        color: tab === id ? '#fff' : '#5C6B61',
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F4EFE6' }} dir="rtl">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 12, borderBottom: '1px solid rgba(13,26,18,.1)', background: '#fff' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94A39A' }}>תצוגה מקדימה:</span>
        {tabBtn('hub', 'הכנה למשחק')}
        {tabBtn('form', 'טופס יצירת הכנה')}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'hub' && (
          <MatchdayHub
            prep={prep}
            players={players}
            matchAnalyses={matchAnalyses}
            onBack={() => {}}
            onRefresh={() => {}}
          />
        )}
      </div>

      {tab === 'form' && (
        <GamePrepForm
          teamId="team-1"
          players={players}
          generalPreps={[]}
          onClose={() => setTab('hub')}
          onSaved={() => setTab('hub')}
        />
      )}
    </div>
  );
}
