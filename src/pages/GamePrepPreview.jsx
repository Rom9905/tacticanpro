// Dev-only preview of the game-prep screens so they can be reviewed (esp. on
// mobile) without logging in. Renders the real components with mock data.
// Public route registered in App.jsx before the auth gate.
import React, { useState, useEffect } from 'react';
import { objectFingerprint, matchFingerprint } from '@/lib/analysisFingerprint';
import MatchdayHub from '@/components/gameprep/MatchdayHub';
import GamePrepForm from '@/components/gameprep/GamePrepForm';
import MatchAnalysisModal from '@/components/analysis/MatchAnalysisModal';
import MatchAnalysisHero from '@/components/analysis/MatchAnalysisHero';
import MatchReportCard from '@/components/analysis/MatchReportCard';
import { MA, matchAnalysisStyles } from '@/components/analysis/matchAnalysisTheme';

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

// ── Mock match analysis for the single-analysis modal (no team_id => no network) ──
const matchData = {
  id: 'ma-preview-1',
  opponent: 'מכבי צפון',
  date: '2026-05-10',
  location: 'אצטדיון הבית',
  result: { our_score: 2, opponent_score: 1 },
  analysis_types: ['statistics', 'video', 'free'],
  stats: {
    possession: 58, pass_accuracy: 81, xg: 1.8, turnovers: 14, shots: 12,
    shots_on_target: 5, passes: 420, tackles: 18, interceptions: 11, critical_errors: 2,
  },
  free_notes: 'הלחץ הגבוה עבד בחצי הראשון אבל התפרק בחצי השני כשהתעייפנו.',
  video_moments: [
    { timestamp: "23'", note: 'מעבר הגנה מהיר שהוביל לשער הראשון.', situation_tag: 'מעבר התקפי' },
    { timestamp: "58'", note: 'איבוד כדור באזור הבנייה תחת לחץ.', situation_tag: 'בנייה מהגנה' },
    { timestamp: "77'", note: 'ספיגה ממצב נייח — כדור רוחב שני.', situation_tag: 'מצבים נייחים' },
  ],
  player_ratings: [
    { player_id: 'p1', player_name: 'רועי לוי', rating: 8, note: 'שוער' },
    { player_id: 'p3', player_name: 'איתי בר', rating: 7, note: 'בלם' },
    { player_id: 'p8', player_name: 'גיא רון', rating: 9, note: 'קשר התקפי' },
    { player_id: 'p10', player_name: 'עידו פז', rating: 6, note: 'חלוץ' },
    { player_id: 'p11', player_name: 'שגיא לב', rating: 7, note: 'כנף' },
    { player_id: 'p12', player_name: 'אורי מור', did_not_play: true },
  ],
  tactical_problems: [
    { text: 'הלחץ הגבוה התפרק בחצי השני ואיפשר ליריבה לבנות בנוחות.', severity: 'high', category: 'לחץ גבוה', root_cause: 'מרחקים גדלים בין הקווים עם העייפות' },
    { text: 'איבודי כדור באזור הבנייה תחת לחץ יריב.', severity: 'medium', category: 'בנייה מהגנה', root_cause: 'מעט אופציות מסירה קצרה' },
    { text: 'ספיגה ממצב נייח על כדור רוחב שני.', severity: 'medium', category: 'מצבים נייחים', root_cause: 'סימון רופף בקרן הרחוקה' },
  ],
  training_actions: [
    { focus: 'דחיסת מרחקים בלחץ תחת עייפות' },
    { focus: 'יציאה מלחץ עם אופציות קצרות' },
    { focus: 'סימון בקרן הרחוקה במצבים נייחים' },
    { focus: 'מעברים התקפיים מהירים' },
  ],
  _summary: {
    what_worked: 'מעברים התקפיים מהירים, ניצול חלל הגב.',
    issues_found: 'הלחץ התפרק בחצי השני, איבודי כדור בבנייה.',
    tactical_insights: 'הקבוצה שלטה במשחק אך התקשתה לשמר את מבנה הלחץ לאורך 90 דקות. בחצי הראשון הלחץ הגבוה חנק את היריבה, אך עם העייפות המרחקים בין הקווים גדלו והיריבה מצאה מרחב לבנות. הניצחון הושג בזכות יעילות במעברים ולא בזכות שליטה מתמשכת.',
    result_our: 2, result_opponent: 1,
  },
};

const matchFp = matchFingerprint(matchData);
matchData.ai_summary = {
  fingerprint: matchFp,
  summary: 'שלטתם במשחק עם 58% החזקה, אבל הסיפור האמיתי הוא היעילות במעברים — 2 שערים ממהלכי מעבר מהירים, לא ממשחק עמדתי. הלחץ הגבוה עבד מצוין בחצי הראשון וחנק את הבנייה של היריבה, אבל בחצי השני, עם העייפות, המרחקים בין הקווים גדלו והם מצאו מרחב. הניצחון מגיע, אבל השליטה לא הייתה מתמשכת.',
  insights: {
    critical_issue: 'הלחץ הגבוה לא שרד את החצי השני — המרחקים בין הקווים גדלו עם העייפות.',
    improvement_area: 'איבודי כדור בשלב הבנייה תחת לחץ — חסרו אופציות מסירה קצרה.',
    positive_point: 'מעברים התקפיים מהירים ייצרו את שני השערים מניצול חלל הגב.',
  },
};
matchData.deep_analysis = {
  fingerprint: matchFp,
  data_richness: 'rich',
  story: 'המשחק נפתח בשליטה שלכם: הלחץ הגבוה אילץ את היריבה לכדורים ארוכים, ומשם ניצלתם את חלל הגב פעמיים במעברים מהירים. עד ההפסקה התמונה הייתה ברורה — אתם מכתיבים. בחצי השני הקצב ירד, המרחקים בין קו הלחץ לקו האמצע גדלו, והיריבה הצליחה לבנות דרך המרכז. הספיגה הגיעה ממצב נייח, אבל האזהרה האמיתית היא מבנה הלחץ שהתרופף — זה מה שדורש עבודה.',
  issue_expansions: [
    { issue: 'הלחץ הגבוה התפרק בחצי השני ואיפשר ליריבה לבנות בנוחות.', explanation: 'קורה כשהשחקנים מתעייפים והמרחקים בין הקווים גדלים — קו הלחץ הראשון נעקף והיריב מוצא עדיפות מספרית במרכז.', supporting_data: 'דיוק המסירות שלכם ירד והיריבה החזיקה יותר כדור אחרי ההפסקה.' },
    { issue: 'איבודי כדור באזור הבנייה תחת לחץ יריב.', explanation: 'כשאין מספיק אופציות מסירה קצרה, הבלמים נאלצים לכדור ארוך או לאיבוד באזור מסוכן.', supporting_data: '14 איבודי כדור — חלקם באזור הבנייה.' },
  ],
  clarifying_questions: [],
  training_topic_context: [
    { topic: 'דחיסת מרחקים בלחץ תחת עייפות', story_link: 'הלחץ שהתפרק בחצי השני מחייב עבודה על שמירת מרחקים גם כשעייפים.' },
  ],
};

// ── Mock data for the match-analysis page (hero + report cards) ──
const pageStats = { matches: 8, wins: 4, draws: 2, losses: 2, goalsFor: 15, goalsAgainst: 9 };
const pageForm = ['win', 'draw', 'win', 'loss', 'win'];
const pageAnalyses = [
  { ...matchData },
  {
    id: 'ma-preview-2', opponent: 'הפועל דרום', date: '2026-05-03', location: 'חוץ',
    result: { our_score: 1, opponent_score: 1 },
    stats: { possession: 46 },
    _summary: { result_our: 1, result_opponent: 1, tactical_topics: ['בנייה מהגנה'], issues_found: 'קושי ביציאה מלחץ גבוה של היריבה לאורך כל המשחק.' },
  },
  {
    id: 'ma-preview-3', opponent: 'בני מזרח על שם משפחת ארוכי-שם מאוד', date: '2026-04-26', location: 'בית',
    result: { our_score: 0, opponent_score: 2 },
    stats: { possession: 61 },
    _summary: { result_our: 0, result_opponent: 2, tactical_topics: ['מעברים הגנתיים'], issues_found: 'שתי ספיגות ממעברים מהירים אחרי איבוד כדור בשליש הקדמי — הקבוצה נשארה חשופה מאחור.' },
  },
];

// Pre-seed the BottomLine cache so it renders without an LLM call.
function seedBottomLine() {
  try {
    const key = `match-${matchData.id}-${matchFp}`;
    localStorage.setItem(`bl_${key}`, JSON.stringify({
      insight: 'הניצחון נבנה על יעילות במעברים ולא על שליטה — שני השערים הגיעו ממהלכי חלל גב, בעוד 58% החזקה הניבו רק 5 בעיטות למסגרת.',
      action: 'לעבוד על שימור מבנה הלחץ בחצי השני כדי להפוך שליטה ליתרון מתמשך.',
    }));
  } catch (e) { /* ignore */ }
}

export default function GamePrepPreview() {
  const [tab, setTab] = useState('hub');

  useEffect(() => { seedBottomLine(); }, []);

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
      <style>{matchAnalysisStyles}</style>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 12, borderBottom: '1px solid rgba(13,26,18,.1)', background: '#fff' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94A39A' }}>תצוגה מקדימה:</span>
        {tabBtn('hub', 'הכנה למשחק')}
        {tabBtn('form', 'טופס יצירת הכנה')}
        {tabBtn('match', 'מודל ניתוח משחק')}
        {tabBtn('matchpage', 'עמוד ניתוח משחקים')}
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

      {tab === 'matchpage' && (
        <div style={{ backgroundColor: MA.bgPage, padding: '28px 16px', fontFamily: MA.body, color: MA.textPrimary }} dir="rtl">
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div style={{ background: MA.bgContainer, borderRadius: 20, overflow: 'hidden', boxShadow: MA.containerShadow }}>
              <MatchAnalysisHero
                stats={pageStats} form={pageForm} view="list"
                onViewChange={() => {}} onNewAnalysis={() => {}}
                teamSelector={null} titleExtra={null} isHe={true}
              />
              <div className="ma-pad">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pageAnalyses.map((a, i) => (
                    <MatchReportCard key={a.id} analysis={a} index={i} onClick={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'match' && (
        <MatchAnalysisModal
          open={true}
          onClose={() => setTab('hub')}
          analysis={matchData}
          teamName="הפועל אקדמיית הכדורגל העירונית"
          onRefresh={() => {}}
          seasonAverages={{ possession: 52, pass_accuracy: 78, xg: 1.4, shots: 10 }}
        />
      )}
    </div>
  );
}
