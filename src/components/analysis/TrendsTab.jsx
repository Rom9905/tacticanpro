import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  TrendingUp, TrendingDown, Minus, Repeat, Sparkles, Loader2,
  AlertTriangle, LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { buildStatSeries, computeStatTrends, findRecurringIssues } from '@/lib/trendsEngine';
import { MA } from './matchAnalysisTheme';

// The design leads the comparison card with these four, in this order, and uses
// shorter labels than the trends engine's defaults.
const LEAD_ORDER = ['goals_for', 'goals_against', 'possession', 'turnovers'];
const SHORT_LABEL = {
  goals_for: 'הבקענו',
  goals_against: 'ספגנו',
  possession: 'החזקה',
  turnovers: 'איבודים',
};

export default function TrendsTab({ analyses }) {
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const series = useMemo(() => buildStatSeries(analyses), [analyses]);
  const statTrends = useMemo(() => computeStatTrends(analyses), [analyses]);
  const recurring = useMemo(() => findRecurringIssues(analyses), [analyses]);

  // Goals already come from the trends engine — just lead with them and shorten
  // the labels to match the design.
  const trends = useMemo(() => {
    const rank = key => {
      const i = LEAD_ORDER.indexOf(key);
      return i === -1 ? LEAD_ORDER.length : i;
    };
    return statTrends
      .map(t => ({ ...t, label: SHORT_LABEL[t.key] || t.label }))
      .sort((a, b) => rank(a.key) - rank(b.key));
  }, [statTrends]);

  // Season chart: scored, conceded, and the running goal difference.
  const chartData = useMemo(() => {
    let cumulative = 0;
    return series.map(r => {
      const hasScore = r.goals_for != null && r.goals_against != null;
      if (hasScore) cumulative += r.goals_for - r.goals_against;
      return { ...r, cum_diff: hasScore ? cumulative : null };
    });
  }, [series]);

  const chartHasData = chartData.some(r => r.goals_for != null || r.goals_against != null);

  const generateAiInsights = async () => {
    setAiLoading(true);
    setAiError(null);

    const trendLines = trends.map(t =>
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

    if (result?.__ai_error) setAiError(result.__ai_error);
    else setAiInsights(result);
    setAiLoading(false);
  };

  if (!analyses || analyses.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 16, background: MA.card, boxShadow: MA.cardShadow }}>
        <LineChartIcon style={{ width: 40, height: 40, color: MA.textFaint, margin: '0 auto 12px' }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: MA.textPrimary }}>צריך לפחות 2 משחקים כדי לראות מגמות</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: MA.textSecondary }}>המשך להזין ניתוחי משחקים והמגמות יופיעו כאן</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} dir="rtl">
      {/* ── AI mentor read on the season ── */}
      <div className="ma-fade" style={{
        borderRadius: 16, padding: '18px 20px', background: MA.darkPanel,
        border: '1px solid rgba(74,222,128,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: aiInsights || aiLoading || aiError ? 14 : 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: MA.greenAccent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles style={{ width: 14, height: 14 }} /> ניתוח מגמות AI
          </p>
          <button onClick={generateAiInsights} disabled={aiLoading} className="ma-hit"
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: MA.greenAccent,
              color: '#0D1A12', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontFamily: MA.body,
              opacity: aiLoading ? 0.6 : 1,
            }}>
            {aiLoading ? 'מנתח...' : aiInsights ? 'רענן ניתוח' : 'נתח מגמות'}
          </button>
        </div>
        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MA.greenAccent }} />
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(244,239,230,.7)' }}>המנטור עובר על כל המשחקים ומחפש דפוסים...</p>
          </div>
        )}
        {aiError && <p style={{ margin: 0, fontSize: 12, color: '#EF8B8B' }}>{aiError}</p>}
        {aiInsights && !aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.55, color: MA.cream, fontFamily: MA.heading }}>
              {aiInsights.headline}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(aiInsights.trends || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: MA.greenAccent, marginTop: 7, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(244,239,230,.85)' }}>{t}</p>
                </div>
              ))}
            </div>
            <div className="ma-grid-2" style={{ gap: 10 }}>
              {aiInsights.watch_out && (
                <div style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(239,139,139,.1)', border: '1px solid rgba(239,139,139,.25)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#EF8B8B' }}>שים לב</p>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'rgba(244,239,230,.85)' }}>{aiInsights.watch_out}</p>
                </div>
              )}
              {aiInsights.positive && (
                <div style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: MA.greenAccent }}>מה שעובד</p>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'rgba(244,239,230,.85)' }}>{aiInsights.positive}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Last 3 vs previous 3 ── */}
      {trends.length > 0 && (
        <div className="ma-fade" style={{ background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow, animationDelay: '80ms' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: MA.textPrimary, fontFamily: MA.heading }}>
            3 משחקים אחרונים מול 3 שלפניהם
          </p>
          <div className="ma-grid-4">
            {trends.map(t => {
              const Icon = t.direction === 'up' ? TrendingUp : t.direction === 'down' ? TrendingDown : Minus;
              const color = t.good === null ? MA.textSecondary : t.good ? MA.greenMain : MA.danger;
              const bg = t.good === null ? 'rgba(13,26,18,.04)' : t.good ? MA.successBg : MA.dangerBg;
              return (
                <div key={t.key} style={{ borderRadius: 12, padding: '12px 14px', background: bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: MA.textSecondary }}>{t.label}</span>
                    <Icon style={{ width: 14, height: 14, color }} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color, fontFamily: MA.heading }}>
                    {t.recent}{t.suffix}
                    <span style={{ fontSize: 11, fontWeight: 500, color: MA.textMuted, marginInlineStart: 6 }}>
                      מ-{t.previous}{t.suffix}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Season chart: scored / conceded / running difference ── */}
      <div className="ma-fade" style={{ background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow, animationDelay: '140ms' }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: MA.textPrimary, fontFamily: MA.heading }}>
          שערים, ספיגות והפרש — לאורך העונה
        </p>
        {chartHasData ? (
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,26,18,.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: MA.textSecondary }} />
                <YAxis tick={{ fontSize: 11, fill: MA.textSecondary }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid rgba(13,26,18,.1)', fontSize: 12, fontFamily: MA.body, direction: 'rtl' }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${row.name} · ${row.date}` : label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: MA.body }} />
                <Line type="monotone" dataKey="goals_for" name="הבקענו" stroke={MA.greenMain}
                  strokeWidth={2.5} connectNulls dot={{ r: 4, fill: MA.greenMain }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="goals_against" name="ספגנו" stroke={MA.danger}
                  strokeWidth={2.5} connectNulls dot={{ r: 4, fill: MA.danger }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="cum_diff" name="הפרש שערים מצטבר" stroke="#0D1A12"
                  strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.7} connectNulls
                  dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: MA.textMuted, textAlign: 'center', padding: '30px 0' }}>
            אין תוצאות משחקים להצגה — הזן תוצאה בניתוחי המשחקים כדי לראות את הגרף
          </p>
        )}
      </div>

      {/* ── Recurring issues ── */}
      <div className="ma-fade" style={{ background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow, animationDelay: '200ms' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: MA.danger, fontFamily: MA.heading, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Repeat style={{ width: 15, height: 15 }} /> בעיות חוזרות לאורך העונה
        </p>
        {recurring.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: MA.textMuted }}>
            לא זוהו בעיות שחוזרות על עצמן — סימן טוב, או שחסרים נתוני בעיות בניתוחים
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recurring.slice(0, 8).map((r, i) => {
              const hot = r.streak >= 2;
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
                  background: hot ? MA.dangerBg : 'rgba(13,26,18,.03)',
                }}>
                  <span style={{
                    minWidth: 34, textAlign: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 11,
                    fontWeight: 800, flexShrink: 0, fontFamily: MA.heading,
                    background: hot ? MA.danger : 'rgba(13,26,18,.08)', color: hot ? '#fff' : MA.textSecondary,
                  }}>
                    ×{r.count}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: MA.textPrimary }}>{r.representative}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: MA.textMuted }}>
                      {hot && (
                        <span style={{ color: MA.danger, fontWeight: 700 }}>
                          <AlertTriangle className="w-3 h-3 inline ml-1" style={{ verticalAlign: '-2px' }} />
                          {r.streak} משחקים אחרונים ברצף ·{' '}
                        </span>
                      )}
                      {r.matchLabels.slice(-4).join(' · ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
