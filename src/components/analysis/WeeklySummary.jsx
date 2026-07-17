import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, Sparkles, Pause, Repeat, Dumbbell } from 'lucide-react';
import { subDays, isWithinInterval } from 'date-fns';
import { useLang } from '@/lib/LanguageContext';
import { MA } from './matchAnalysisTheme';

export default function WeeklySummary({ analyses, teamId }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState(7);

  const getRecentAnalyses = () => {
    const now = new Date();
    const start = subDays(now, timeRange);
    return analyses.filter(a => {
      const matchDate = new Date(a.date);
      return isWithinInterval(matchDate, { start, end: now });
    });
  };

  const generateSummary = async () => {
    setGenerating(true);
    const recentGames = getRecentAnalyses();

    if (recentGames.length === 0) {
      setSummary({
        message: isHe
          ? `לא נמצאו משחקים ב-${timeRange} הימים האחרונים`
          : `No matches found in the last ${timeRange} days`,
        improvements: [], stuck_areas: [], recommendations: []
      });
      setGenerating(false);
      return;
    }

    const gamesText = recentGames.map((a, i) => {
      const issues = a.report?.issues || [];
      const positives = a.report?.positives || [];
      return `Match ${i + 1}: vs ${a.opponent} (${a.result?.our_score}-${a.result?.opponent_score})\nPositives: ${positives.join(', ')}\nIssues: ${issues.join(', ')}`;
    }).join('\n\n');

    const prompt = `You are a professional football analyst. Summarize the team's last ${timeRange} days:

${gamesText}

Create a summary that includes:
1. What improved compared to the previous period (2-3 points)
2. What is stuck and hasn't changed (2-3 points)
3. Specific recommendations for next week (3-4 actions)
4. Is there a recurring issue appearing in all matches?

Be concise and specific. Focus on patterns, not individual games. Reply in ${isHe ? 'Hebrew' : 'English'}.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          improvements: { type: 'array', items: { type: 'string' } },
          stuck_areas: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          recurring_issue: { type: 'string' },
        },
      },
    });

    if (response?.__ai_error) {
      setSummary({ error: response.__ai_error });
    } else {
      setSummary(response);
      if (teamId) {
        try {
          await base44.entities.Team.update(teamId, {
            weekly_summary_cache: { data: response, timeRange, analysis_count: recentGames.length, updated_at: new Date().toISOString() }
          });
        } catch (e) { console.warn('Failed to cache weekly summary:', e); }
      }
    }
    setGenerating(false);
  };

  useEffect(() => {
    setSummary(null);
    if (teamId) {
      base44.entities.Team.filter({ id: teamId }).then(teams => {
        const cache = teams[0]?.weekly_summary_cache;
        const recentCount = getRecentAnalyses().length;
        if (cache?.data && cache.timeRange === timeRange && cache.analysis_count === recentCount) {
          setSummary(cache.data);
        }
      }).catch(() => {});
    }
  }, [timeRange, analyses]);

  const recentGames = getRecentAnalyses();

  const listCard = ({ title, icon: Icon, color, items, delay }) => (
    <div className="ma-fade" style={{
      background: MA.card, borderRadius: 16, padding: '20px 22px',
      boxShadow: MA.cardShadow, borderTop: `4px solid ${color}`, animationDelay: `${delay}ms`,
    }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color, fontFamily: MA.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon style={{ width: 15, height: 15 }} /> {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 2, color: MA.textSecondary }}>
        {items.map((item, i) => <li key={i}>• {item}</li>)}
      </ul>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 9999, background: 'rgba(13,26,18,.05)' }}>
          {[7, 14, 30].map(days => {
            const active = timeRange === days;
            return (
              <button key={days} onClick={() => setTimeRange(days)}
                style={{
                  padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 700 : 600, fontFamily: MA.body,
                  background: active ? '#0D1A12' : 'transparent',
                  color: active ? MA.greenAccent : MA.textSecondary,
                }}>
                {days} {isHe ? 'ימים' : 'days'}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 12, color: MA.textMuted }}>
          {isHe
            ? `${recentGames.length} משחקים בתקופה`
            : `${recentGames.length} matches in period`}
        </span>

        <button onClick={generateSummary} disabled={generating || recentGames.length === 0}
          style={{
            marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 9999, border: 'none', fontFamily: MA.body,
            fontSize: 12, fontWeight: 700,
            background: recentGames.length === 0 ? 'rgba(13,26,18,.06)' : MA.greenAccent,
            color: recentGames.length === 0 ? MA.textMuted : '#0D1A12',
            cursor: generating ? 'wait' : recentGames.length === 0 ? 'not-allowed' : 'pointer',
          }}>
          {generating
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isHe ? 'מייצר סיכום...' : 'Generating...'}</>
            : <><Sparkles style={{ width: 14, height: 14 }} />{isHe ? 'צור סיכום' : 'Generate Summary'}</>}
        </button>
      </div>

      {summary?.error && (
        <div style={{ borderRadius: 16, padding: '14px 18px', background: MA.warnBg }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MA.warn }}>שירות ה-AI אינו זמין</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: MA.textSecondary }}>{summary.error}</p>
        </div>
      )}

      {summary && !summary.error && (
        <>
          {(summary.improvements?.length > 0 || summary.stuck_areas?.length > 0) && (
            <div className="ma-grid-2">
              {summary.improvements?.length > 0 && listCard({
                title: isHe ? 'מה השתפר' : 'What Improved',
                icon: TrendingUp, color: MA.greenMain, items: summary.improvements, delay: 0,
              })}
              {summary.stuck_areas?.length > 0 && listCard({
                title: isHe ? 'מה נתקע' : 'What Is Stuck',
                icon: Pause, color: MA.warn, items: summary.stuck_areas, delay: 60,
              })}
            </div>
          )}

          {summary.recurring_issue && (
            <div className="ma-fade" style={{
              borderRadius: 16, padding: '18px 22px', background: 'linear-gradient(135deg,#2A0D0D,#4A1414)',
              border: '1px solid rgba(248,113,113,.3)', display: 'flex', alignItems: 'center', gap: 10,
              animationDelay: '80ms',
            }}>
              <Repeat style={{ width: 20, height: 20, color: MA.lossRed, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: MA.lossRed, fontFamily: MA.heading }}>
                  {isHe ? 'אזהרה: בעיה חוזרת' : 'Warning: Recurring Issue'}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(244,239,230,.8)' }}>{summary.recurring_issue}</p>
              </div>
            </div>
          )}

          {summary.recommendations?.length > 0 && (
            <div className="ma-fade" style={{
              background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow,
              animationDelay: '160ms',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: MA.textPrimary, fontFamily: MA.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dumbbell style={{ width: 15, height: 15 }} />
                {isHe ? 'נושאים מומלצים לשבוע הקרוב' : 'Recommended topics for next week'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {summary.recommendations.map((item, i) => (
                  <span key={i} style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 9999,
                    background: MA.successBg, color: MA.greenMain,
                  }}>{item}</span>
                ))}
              </div>
            </div>
          )}

          {summary.message && (
            <div style={{ background: MA.card, borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: MA.cardShadow }}>
              <p style={{ margin: 0, fontSize: 13, color: MA.textMuted }}>{summary.message}</p>
            </div>
          )}
        </>
      )}

      {!summary && !generating && (
        <div style={{ background: MA.card, borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: MA.cardShadow }}>
          <TrendingUp style={{ width: 44, height: 44, color: MA.textFaint, margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: 13, color: MA.textMuted }}>
            {recentGames.length === 0
              ? (isHe ? `אין משחקים ב-${timeRange} הימים האחרונים` : `No matches in the last ${timeRange} days`)
              : (isHe ? 'לחץ על "צור סיכום" כדי לקבל תובנות על התקופה' : 'Click "Generate Summary" for period insights')}
          </p>
        </div>
      )}
    </div>
  );
}
