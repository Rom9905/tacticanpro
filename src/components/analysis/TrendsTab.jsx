import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  TrendingUp, TrendingDown, Minus, RepeatIcon, Sparkles, Loader2,
  AlertTriangle, LineChart as LineChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  buildStatSeries, computeStatTrends, findRecurringIssues, TREND_STATS,
} from '@/lib/trendsEngine';

const SHADOW_CARD = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

const CHART_OPTIONS = [
  { key: 'goals', label: 'שערים', lines: [
    { dataKey: 'goals_for', name: 'הבקענו', color: '#16A34A' },
    { dataKey: 'goals_against', name: 'ספגנו', color: '#DC2626' },
  ]},
  { key: 'possession', label: 'החזקת כדור', lines: [{ dataKey: 'possession', name: 'החזקה %', color: '#2563EB' }] },
  { key: 'xg', label: 'xG', lines: [{ dataKey: 'xg', name: 'xG', color: '#7C3AED' }] },
  { key: 'turnovers', label: 'איבודים וטעויות', lines: [
    { dataKey: 'turnovers', name: 'איבודי כדור', color: '#D97706' },
    { dataKey: 'critical_errors', name: 'טעויות קריטיות', color: '#DC2626' },
  ]},
];

export default function TrendsTab({ analyses, teamId }) {
  const [chartKey, setChartKey] = useState('goals');
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const series = useMemo(() => buildStatSeries(analyses), [analyses]);
  const statTrends = useMemo(() => computeStatTrends(analyses), [analyses]);
  const recurring = useMemo(() => findRecurringIssues(analyses), [analyses]);

  const chart = CHART_OPTIONS.find(c => c.key === chartKey);
  const chartHasData = series.some(r => chart.lines.some(l => r[l.dataKey] !== null && r[l.dataKey] !== undefined));

  const generateAiInsights = async () => {
    setAiLoading(true);
    setAiError(null);

    const trendLines = statTrends.map(t =>
      `${t.label}: ממוצע ${t.previous} → ${t.recent} (${t.direction === 'up' ? 'עלייה' : t.direction === 'down' ? 'ירידה' : 'יציב'})`
    ).join('\n');
    const recurringLines = recurring.slice(0, 6).map(r =>
      `"${r.representative}" — הופיעה ב-${r.count} משחקים${r.streak >= 2 ? ` (כולל ${r.streak} משחקים אחרונים ברצף)` : ''}`
    ).join('\n');
    const resultsLine = series.map(r => `${r.name}: ${r.goals_for ?? '?'}-${r.goals_against ?? '?'}`).join(', ');

    const prompt = `אתה מנטור בכיר — אנליסט שמזהה מגמות לאורך זמן ומדבר ישיר, בגובה העיניים.
נתוני העונה של הקבוצה (${series.length} משחקים, כרונולוגי):
תוצאות: ${resultsLine}

מגמות סטטיסטיות (השוואת 3 משחקים אחרונים מול 3 שלפניהם):
${trendLines || 'אין מספיק נתונים סטטיסטיים'}

בעיות חוזרות:
${recurringLines || 'לא זוהו בעיות חוזרות'}

צור ניתוח מגמות (JSON):
{
  "headline": "משפט אחד — המגמה הכי חשובה שהמאמן חייב לדעת עכשיו",
  "trends": ["3-4 תובנות מגמה ספציפיות — כל אחת מחברת בין נתונים לתמונה הגדולה. למשל: 'זה המשחק השלישי ברצף ש...'"],
  "watch_out": "אזהרה אחת — מה עלול להתדרדר אם לא מטפלים",
  "positive": "דבר אחד חיובי שמשתפר — לתת למאמן קרדיט אמיתי"
}
דבר כמו מנטור: 'תראה, ...' ולא 'זוהתה מגמה'. עברית בלבד.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          trends: { type: 'array', items: { type: 'string' } },
          watch_out: { type: 'string' },
          positive: { type: 'string' },
        },
      },
    });

    if (result?.__ai_error) {
      setAiError(result.__ai_error);
    } else {
      setAiInsights(result);
    }
    setAiLoading(false);
  };

  if (!analyses || analyses.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 14, background: '#fff', boxShadow: SHADOW_CARD }}>
        <LineChartIcon className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#14231A' }}>צריך לפחות 2 משחקים כדי לראות מגמות</p>
        <p style={{ fontSize: 12, color: '#5C6B61', marginTop: 4 }}>המשך להזין ניתוחי משחקים והמגמות יופיעו כאן</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} dir="rtl">

      {/* ── AI Insights ── */}
      <div style={{ borderRadius: 14, padding: 18, background: 'linear-gradient(135deg,#0D1A12 0%,#12251A 100%)', border: '1px solid rgba(74,222,128,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiInsights || aiLoading ? 14 : 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles className="w-4 h-4" /> ניתוח מגמות AI
          </p>
          <button onClick={generateAiInsights} disabled={aiLoading}
            style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif', opacity: aiLoading ? 0.6 : 1 }}>
            {aiLoading ? 'מנתח...' : aiInsights ? 'רענן ניתוח' : 'נתח מגמות'}
          </button>
        </div>
        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4ADE80' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(244,239,230,.7)' }}>המנטור עובר על כל המשחקים ומחפש דפוסים...</p>
          </div>
        )}
        {aiError && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#EF8B8B' }}>{aiError}</p>
        )}
        {aiInsights && !aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: '#E9F7EE', fontFamily: 'Heebo,sans-serif' }}>{aiInsights.headline}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(aiInsights.trends || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', marginTop: 7, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(244,239,230,.85)' }}>{t}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {aiInsights.watch_out && (
                <div style={{ borderRadius: 10, padding: '10px 14px', background: 'rgba(239,139,139,.1)', border: '1px solid rgba(239,139,139,.25)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#EF8B8B' }}>שים לב</p>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'rgba(244,239,230,.85)' }}>{aiInsights.watch_out}</p>
                </div>
              )}
              {aiInsights.positive && (
                <div style={{ borderRadius: 10, padding: '10px 14px', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#4ADE80' }}>מה שעובד</p>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'rgba(244,239,230,.85)' }}>{aiInsights.positive}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Stat trend chips ── */}
      {statTrends.length > 0 && (
        <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#14231A' }}>מגמות סטטיסטיות · 3 משחקים אחרונים מול 3 שלפניהם</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {statTrends.map(t => {
              const Icon = t.direction === 'up' ? TrendingUp : t.direction === 'down' ? TrendingDown : Minus;
              const color = t.good === null ? '#5C6B61' : t.good ? '#16A34A' : '#DC2626';
              const bg = t.good === null ? 'rgba(13,26,18,.04)' : t.good ? '#E7F6EC' : '#FCEBEB';
              return (
                <div key={t.key} style={{ borderRadius: 10, padding: '10px 12px', background: bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#5C6B61' }}>{t.label}</p>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color, fontFamily: 'Heebo,sans-serif' }}>
                    {t.recent}{t.suffix}
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94A39A', marginRight: 6 }}> מ-{t.previous}{t.suffix}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14231A' }}>גרף לאורך העונה</p>
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9999, background: 'rgba(13,26,18,.05)' }}>
            {CHART_OPTIONS.map(c => (
              <button key={c.key} onClick={() => setChartKey(c.key)}
                style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: chartKey === c.key ? '#0D1A12' : 'transparent', color: chartKey === c.key ? '#4ADE80' : '#5C6B61', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {chartHasData ? (
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,26,18,.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5C6B61' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6B61' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid rgba(13,26,18,.1)', fontSize: 12, fontFamily: 'Assistant,sans-serif', direction: 'rtl' }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${row.name} · ${row.date}` : label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Assistant,sans-serif' }} />
                {chart.lines.map(l => (
                  <Line key={l.dataKey} type="monotone" dataKey={l.dataKey} name={l.name}
                    stroke={l.color} strokeWidth={2.5} connectNulls
                    dot={{ r: 4, fill: l.color }} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: '#94A39A', textAlign: 'center', padding: '30px 0' }}>
            אין נתוני "{chart.label}" במשחקים — הזן סטטיסטיקות בניתוחי המשחקים כדי לראות את הגרף
          </p>
        )}
      </div>

      {/* ── Recurring issues ── */}
      <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RepeatIcon className="w-4 h-4" /> בעיות חוזרות לאורך העונה
        </p>
        {recurring.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#94A39A' }}>לא זוהו בעיות שחוזרות על עצמן — סימן טוב, או שחסרים נתוני בעיות בניתוחים</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recurring.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: r.streak >= 2 ? '#FCEBEB' : 'rgba(13,26,18,.03)' }}>
                <span style={{ minWidth: 34, textAlign: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: r.streak >= 2 ? '#DC2626' : 'rgba(13,26,18,.08)', color: r.streak >= 2 ? '#fff' : '#5C6B61', flexShrink: 0 }}>
                  ×{r.count}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: '#14231A' }}>{r.representative}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94A39A' }}>
                    {r.streak >= 2 && (
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>
                        <AlertTriangle className="w-3 h-3 inline ml-1" style={{ verticalAlign: '-2px' }} />
                        {r.streak} משחקים אחרונים ברצף ·{' '}
                      </span>
                    )}
                    {r.matchLabels.slice(-4).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
