import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

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

export default function ProblemHeatmap({ analyses }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [heatmap, setHeatmap] = useState({});

  const situationCategories = SITUATION_CATEGORIES_HE; // always use HE keys internally

  useEffect(() => {
    generateHeatmap();
  }, [analyses]);

  const generateHeatmap = () => {
    const problemCount = {};
    situationCategories.forEach(cat => {
      problemCount[cat] = { count: 0, issues: [] };
    });

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
          situationCategories.forEach(cat => {
            if (issue.includes(cat.split(' ')[0])) {
              problemCount[cat].count++;
              problemCount[cat].issues.push({ game: analysis.opponent, note: issue });
            }
          });
        });
      }
    });

    setHeatmap(problemCount);
  };

  const maxCount = Math.max(...Object.values(heatmap).map(v => v.count), 1);

  const getColor = (count) => {
    const intensity = count / maxCount;
    if (intensity === 0) return 'bg-slate-800';
    if (intensity < 0.3) return 'bg-amber-500/20 border-amber-500/30';
    if (intensity < 0.7) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/40';
  };

  const getTextColor = (count) => {
    const intensity = count / maxCount;
    if (intensity === 0) return 'text-slate-600';
    if (intensity < 0.3) return 'text-amber-400';
    if (intensity < 0.7) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
        <p className="text-sm text-slate-400">
          {isHe
            ? 'מפת חום של בעיות לפי מצבי משחק. ככל שהצבע אדום יותר - הבעיה מופיעה יותר פעמים.'
            : 'Problem heatmap by game situation. The redder the color, the more frequently the issue appears.'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SITUATION_CATEGORIES_HE.map((category, idx) => {
          const data = heatmap[category] || { count: 0, issues: [] };
          const displayLabel = isHe ? category : SITUATION_CATEGORIES_EN[idx];
          return (
            <Card key={category} className={`${getColor(data.count)} border transition-all hover:scale-105 cursor-pointer`}>
              <CardContent className="p-6">
                <div className="text-center mb-3">
                  <div className={`text-3xl font-bold ${getTextColor(data.count)}`}>{data.count}</div>
                  <div className="text-sm text-slate-400 mt-1">{displayLabel}</div>
                </div>
                {data.count > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-500 mb-2">{isHe ? 'דוגמאות:' : 'Examples:'}</div>
                    {data.issues.slice(0, 2).map((issue, i) => (
                      <div key={i} className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                        <div className="font-medium text-slate-300 mb-1">
                          {isHe ? `מול ${issue.game}` : `vs ${issue.game}`}
                        </div>
                        <div className="line-clamp-2">{issue.note}</div>
                      </div>
                    ))}
                    {data.issues.length > 2 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{data.issues.length - 2} {isHe ? 'עוד...' : 'more...'}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {isHe ? 'מקרא' : 'Legend'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-800"></div>
              <span className="text-slate-400">{isHe ? 'אין בעיות' : 'No issues'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/20"></div>
              <span className="text-slate-400">{isHe ? 'מעט בעיות' : 'Few issues'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500/20"></div>
              <span className="text-slate-400">{isHe ? 'בעיות משמעותיות' : 'Significant issues'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20"></div>
              <span className="text-slate-400">{isHe ? 'בעיות קריטיות' : 'Critical issues'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}