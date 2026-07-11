import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TrendsSection({ analyses }) {
  if (!analyses || analyses.length < 2) return null;

  const last3 = analyses.slice(0, Math.min(3, analyses.length));

  // Collect all issues from last 3 matches
  const issueMap = {};

  last3.forEach((match, matchIndex) => {
    const issues = [
      ...(match.report?.issues || []),
      ...(match._summary?.issues_found ? [match._summary.issues_found] : []),
      ...(match.phase_analysis?.buildup?.issues || []),
      ...(match.phase_analysis?.transitions?.attack?.issues || []),
      ...(match.phase_analysis?.transitions?.defense?.issues || []),
      ...(match.phase_analysis?.organized_defense?.issues || []),
    ];

    issues.forEach(issue => {
      const key = issue.trim().toLowerCase();
      if (!issueMap[key]) {
        issueMap[key] = { text: issue, count: 0, matches: [] };
      }
      issueMap[key].count++;
      issueMap[key].matches.push(matchIndex);
    });
  });

  // Filter recurring issues (appeared in 2+ matches)
  const trends = Object.values(issueMap)
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (trends.length === 0) return null;

  const getExplanation = (count, totalMatches) => {
    if (count === totalMatches) {
      return `הבעיה הזאת הופיעה בכל ${totalMatches} המשחקים האחרונים - זה מצריך תשומת לב מיידית ועבודה ממוקדת באימונים`;
    }
    if (count === totalMatches - 1) {
      return `זוהתה ב-${count} מתוך ${totalMatches} משחקים - מגמה חוזרת שצריך לטפל בה לפני שהיא הופכת לדפוס קבוע`;
    }
    return `הופיעה ב-${count} מהמשחקים האחרונים - כדאי לשים לב ולעבוד על זה באימונים`;
  };

  return (
    <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2C2416' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#D97706' }} />
          מגמות – {last3.length} המשחקים האחרונים
        </CardTitle>
        <p className="text-xs mt-1" style={{ color: '#9A8672' }}>
          דפוסים שחוזרים במשחקים שונים ומצביעים על תחומי עבודה קבועים
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {trends.map((trend, i) => {
          const status = trend.count === last3.length ? 'critical' : 'needs_work';
          const color = status === 'critical' ? '#B94040' : '#D97706';
          const bgColor = status === 'critical' ? 'rgba(185,64,64,0.08)' : 'rgba(217,119,6,0.08)';
          const label = status === 'critical' ? 'בעיה חוזרת - טיפול דחוף' : 'מגמה שדורשת תשומת לב';
          const explanation = getExplanation(trend.count, last3.length);

          return (
            <div key={i} className="p-3 rounded-lg space-y-2" style={{ backgroundColor: bgColor, border: `1px solid ${color}35` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1.5" style={{ color: '#2C2416' }}>
                    {trend.text}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${color}25`, color }}>
                      {label}
                    </span>
                    <span className="text-[10px]" style={{ color: '#9A8672' }}>
                      {trend.count} מתוך {last3.length} משחקים
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#5C4E38', borderRight: `2px solid ${color}40`, paddingRight: '8px' }}>
                    💡 {explanation}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0 pt-1">
                  {last3.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{
                        backgroundColor: trend.matches.includes(idx) ? color : 'rgba(139,115,85,0.18)',
                        border: trend.matches.includes(idx) ? `1.5px solid ${color}` : 'none'
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}