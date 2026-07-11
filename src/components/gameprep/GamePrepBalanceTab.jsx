import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';

const STYLE_OPTIONS = ['הכל', 'לחץ גבוה', 'בנייה מהגנה', 'כדורים ארוכים', 'קטנגות', 'התקפה מהירה', 'כדורים גבוהים', 'התקפה מהצדדים'];

export default function GamePrepBalanceTab({ matchAnalyses }) {
  const [styleFilter, setStyleFilter] = useState('הכל');

  const analyses = matchAnalyses || [];

  // Build rows per opponent formation/style
  const rows = useMemo(() => {
    const map = {};
    analyses.forEach(ma => {
      const formation = ma.opponent_formation || '?';
      const style = ma.opponent_attack_style || '?';
      const key = `${formation}|${style}`;
      if (!map[key]) map[key] = { formation, style, matches: [] };
      map[key].matches.push(ma);
    });
    return Object.values(map);
  }, [analyses]);

  const filtered = styleFilter === 'הכל' ? rows : rows.filter(r => r.style === styleFilter);

  const total = analyses.length;
  const wins = analyses.filter(ma => (ma.result?.our_score ?? 0) > (ma.result?.opponent_score ?? 0)).length;
  const draws = analyses.filter(ma => ma.result && ma.result.our_score === ma.result.opponent_score).length;
  const losses = analyses.filter(ma => (ma.result?.our_score ?? 0) < (ma.result?.opponent_score ?? 0)).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'משחקים', value: total, color: '#2C2416' },
          { label: 'ניצחונות', value: wins, color: '#2A7050' },
          { label: 'תיקו', value: draws, color: '#D97706' },
          { label: 'הפסדים', value: losses, color: '#B94040' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 text-center"
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
            <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9A8672' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Style filter */}
      <div className="flex gap-2 flex-wrap">
        {STYLE_OPTIONS.map(s => (
          <button key={s} onClick={() => setStyleFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: styleFilter === s ? '#2A5FA8' : 'rgba(139,115,85,0.08)',
              color: styleFilter === s ? '#fff' : '#5C4E38',
              border: `1px solid ${styleFilter === s ? 'rgba(42,95,168,0.5)' : 'rgba(139,115,85,0.2)'}`,
            }}>{s}</button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px dashed rgba(139,115,85,0.25)' }}>
          <p className="text-sm" style={{ color: '#9A8672' }}>אין נתונים עדיין — הוסף מערכת/סגנון יריב לסיכומי המשחקים</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,115,85,0.18)' }}>
          <table className="w-full text-xs" dir="rtl">
            <thead>
              <tr style={{ backgroundColor: 'rgba(139,115,85,0.1)', color: '#5C4E38' }}>
                <th className="text-right px-3 py-2 font-semibold">מערכת</th>
                <th className="text-right px-3 py-2 font-semibold">סגנון</th>
                <th className="text-center px-2 py-2 font-semibold">משחקים</th>
                <th className="text-center px-2 py-2 font-semibold">מאזן</th>
                <th className="text-right px-3 py-2 font-semibold">תוצאות</th>
                <th className="text-center px-2 py-2 font-semibold">%נצ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const w = row.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length;
                const d = row.matches.filter(m => m.result && m.result.our_score === m.result.opponent_score).length;
                const l = row.matches.filter(m => (m.result?.our_score ?? 0) < (m.result?.opponent_score ?? 0)).length;
                const winPct = row.matches.length > 0 ? Math.round((w / row.matches.length) * 100) : 0;
                return (
                  <tr key={i} style={{ borderTop: '1px solid rgba(139,115,85,0.1)', backgroundColor: i % 2 === 0 ? '#FAF7F2' : 'rgba(139,115,85,0.04)' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: '#2C2416' }}>{row.formation}</td>
                    <td className="px-3 py-2.5" style={{ color: '#5C4E38' }}>{row.style}</td>
                    <td className="px-2 py-2.5 text-center" style={{ color: '#2C2416' }}>{row.matches.length}</td>
                    <td className="px-2 py-2.5 text-center font-semibold" style={{ color: '#2C2416' }}>
                      <span style={{ color: '#2A7050' }}>{w}</span>·<span style={{ color: '#D97706' }}>{d}</span>·<span style={{ color: '#B94040' }}>{l}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {row.matches.slice(0, 5).map((m, j) => {
                          const isW = (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0);
                          const isD = m.result && m.result.our_score === m.result.opponent_score;
                          return (
                            <span key={j} className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: isW ? 'rgba(42,112,80,0.15)' : isD ? 'rgba(217,119,6,0.15)' : 'rgba(185,64,64,0.15)',
                                color: isW ? '#2A7050' : isD ? '#D97706' : '#B94040',
                              }}>
                              {m.result ? `${m.result.our_score}-${m.result.opponent_score}` : '?'}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold"
                      style={{ color: winPct >= 60 ? '#2A7050' : winPct >= 40 ? '#D97706' : '#B94040' }}>
                      {winPct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}