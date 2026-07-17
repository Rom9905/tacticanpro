import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { MA, severityCell } from './matchAnalysisTheme';

const SITUATION_CATEGORIES_HE = [
  'בנייה מאחור', 'מעבר הגנתי', 'מעבר התקפי', 'לחץ',
  'שליש אחרון', 'כדור קבוע', 'קונטרה', 'אובדן כדור', 'ניהול משחק',
];
const SITUATION_CATEGORIES_EN = [
  'Build from Back', 'Defensive Transition', 'Attacking Transition', 'Pressing',
  'Final Third', 'Set Pieces', 'Counter-Attack', 'Ball Loss', 'Game Management',
];

function mapToCategoryHe(engineCategory, text) {
  if (engineCategory && SITUATION_CATEGORIES_HE.includes(engineCategory)) return engineCategory;
  if (!text) return null;
  if (/בנייה|חזקה|מסירות|דיוק/.test(text)) return 'בנייה מאחור';
  if (/קאונטר|נגד/.test(text)) return 'קונטרה';
  if (/איבוד|טרנאובר/.test(text)) return 'אובדן כדור';
  if (/סט.?פיס|קורנר|בעיטה חופשית|נגיח/.test(text)) return 'כדור קבוע';
  if (/לחץ|pressing|ללחוץ|חטיפ/.test(text)) return 'לחץ';
  if (/שליש|רחבה|xG|בעיטו?ת|גמירה/.test(text)) return 'שליש אחרון';
  if (/הגנ|ספג|בלם|מרחב/.test(text)) return 'מעבר הגנתי';
  if (/התקפ|עומק|חדיר/.test(text)) return 'מעבר התקפי';
  if (/ניהול|שאנן|ריכוז|עבירו/.test(text)) return 'ניהול משחק';
  return null;
}

const LEGEND = [
  { he: 'אין בעיות', en: 'No issues', swatch: { background: MA.surfaceSoft, border: '1px solid rgba(13,26,18,.1)' } },
  { he: 'מעט', en: 'Few', swatch: { background: 'rgba(217,119,6,.18)' } },
  { he: 'משמעותי', en: 'Significant', swatch: { background: 'rgba(249,115,22,.2)' } },
  { he: 'קריטי', en: 'Critical', swatch: { background: 'rgba(220,38,38,.2)' } },
];

export default function ProblemHeatmap({ analyses }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [heatmap, setHeatmap] = useState({});

  useEffect(() => {
    const problemCount = {};
    SITUATION_CATEGORIES_HE.forEach(cat => { problemCount[cat] = { count: 0, issues: [] }; });

    analyses.forEach(analysis => {
      if (analysis.video_moments) {
        analysis.video_moments.forEach(moment => {
          if (moment.decision_type === 'החלטה שגויה' || moment.decision_type === 'בעיה קבוצתית') {
            const cat = moment.situation_tag;
            if (problemCount[cat]) {
              problemCount[cat].count++;
              problemCount[cat].issues.push({ game: analysis.opponent, note: moment.note });
            }
          }
        });
      }

      if (analysis.tactical_problems?.length > 0) {
        analysis.tactical_problems.forEach(problem => {
          const text = problem.text || problem;
          const cat = mapToCategoryHe(problem.category, text);
          if (cat && problemCount[cat]) {
            problemCount[cat].count++;
            problemCount[cat].issues.push({ game: analysis.opponent, note: text });
          }
        });
      } else if (analysis.report?.issues) {
        analysis.report.issues.forEach(issue => {
          SITUATION_CATEGORIES_HE.forEach(cat => {
            if (issue.includes(cat.split(' ')[0])) {
              problemCount[cat].count++;
              problemCount[cat].issues.push({ game: analysis.opponent, note: issue });
            }
          });
        });
      }
    });

    setHeatmap(problemCount);
  }, [analyses]);

  const maxCount = Math.max(...Object.values(heatmap).map(v => v.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: MA.textSecondary }}>
        {isHe
          ? 'בעיות לפי מצבי משחק, מצטבר על פני העונה. אדום = מופיע יותר.'
          : 'Problems by game situation, accumulated across the season. Red = appears more often.'}
      </p>

      <div className="ma-grid-3">
        {SITUATION_CATEGORIES_HE.map((category, idx) => {
          const data = heatmap[category] || { count: 0, issues: [] };
          const cell = severityCell(data.count / maxCount);
          const games = new Set(data.issues.map(i => i.game)).size;
          const sub = data.count === 0
            ? ''
            : isHe
              ? (games > 1 ? `ב-${games} משחקים` : 'במשחק אחד')
              : (games > 1 ? `in ${games} matches` : 'in 1 match');

          return (
            <div key={category} className="ma-fade ma-card-hover" title={data.issues.slice(0, 3).map(i => `מול ${i.game}: ${i.note}`).join('\n')}
              style={{
                borderRadius: 16, padding: 22, background: cell.bg, border: `1px solid ${cell.border}`,
                textAlign: 'center', animationDelay: `${idx * 40}ms`,
              }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: cell.color, fontFamily: MA.heading, lineHeight: 1 }}>
                {data.count}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: MA.textSecondary, marginTop: 4 }}>
                {isHe ? category : SITUATION_CATEGORIES_EN[idx]}
              </div>
              {sub && <div style={{ fontSize: 11, color: MA.textMuted, marginTop: 2 }}>{sub}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: MA.textSecondary, flexWrap: 'wrap' }}>
        {LEGEND.map((l, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, display: 'inline-block', ...l.swatch }} />
            {isHe ? l.he : l.en}
          </span>
        ))}
      </div>
    </div>
  );
}
