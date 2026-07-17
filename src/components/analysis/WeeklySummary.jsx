import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, Pause, Repeat, Dumbbell, RefreshCw } from 'lucide-react';
import { subDays, isWithinInterval } from 'date-fns';
import { useLang } from '@/lib/LanguageContext';
import { MA } from './matchAnalysisTheme';
import { periodFingerprint } from '@/lib/analysisFingerprint';

const RANGES = [7, 14, 30];

// Matches inside a window. Invalid dates are skipped rather than thrown on.
function matchesInRange(analyses, days) {
  const now = new Date();
  const start = subDays(now, days);
  return analyses.filter(a => {
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) return false;
    return isWithinInterval(d, { start, end: now });
  });
}

export default function WeeklySummary({ analyses, teamId }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const [updatedAt, setUpdatedAt] = useState(null);

  const recentGames = useMemo(() => matchesInRange(analyses, timeRange), [analyses, timeRange]);
  const counts = useMemo(
    () => Object.fromEntries(RANGES.map(d => [d, matchesInRange(analyses, d).length])),
    [analyses],
  );

  // Identity of the data this summary is built from — when it changes, the
  // summary regenerates itself; when it doesn't, the cache is reused.
  const fingerprint = useMemo(
    () => `${timeRange}:${periodFingerprint(recentGames)}`,
    [timeRange, recentGames],
  );

  const generateSummary = async () => {
    setGenerating(true);
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
      const stamp = new Date().toISOString();
      setSummary(response);
      setUpdatedAt(stamp);
      if (teamId) {
        try {
          await base44.entities.Team.update(teamId, {
            weekly_summary_cache: { data: response, timeRange, fingerprint, updated_at: stamp },
          });
        } catch (e) { console.warn('Failed to cache weekly summary:', e); }
      }
    }
    setGenerating(false);
  };

  // Keep generateSummary out of the effect's deps — it closes over state that
  // changes every render, and the fingerprint already says when to re-run.
  const generateRef = useRef(generateSummary);
  generateRef.current = generateSummary;

  // Self-updating: reuse the cache while the underlying matches are unchanged,
  // and regenerate on its own as soon as they aren't.
  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setUpdatedAt(null);

    if (recentGames.length === 0) return undefined;

    (async () => {
      let cache = null;
      if (teamId) {
        try {
          const teams = await base44.entities.Team.filter({ id: teamId });
          cache = teams[0]?.weekly_summary_cache || null;
        } catch { /* fall through to regenerate */ }
      }
      if (cancelled) return;

      if (cache?.data && cache.fingerprint === fingerprint) {
        setSummary(cache.data);
        setUpdatedAt(cache.updated_at || null);
        return;
      }
      generateRef.current();
    })();

    return () => { cancelled = true; };
  }, [fingerprint, teamId, recentGames.length]);

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
      {/* Period selector — the match count is on the pill, so an empty window
          explains itself instead of looking broken. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 9999, background: 'rgba(13,26,18,.05)' }}>
          {RANGES.map(days => {
            const active = timeRange === days;
            const count = counts[days] ?? 0;
            return (
              <button key={days} onClick={() => setTimeRange(days)}
                title={isHe ? `${count} משחקים ב-${days} הימים האחרונים` : `${count} matches in the last ${days} days`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 700 : 600, fontFamily: MA.body,
                  background: active ? '#0D1A12' : 'transparent',
                  color: active ? MA.greenAccent : count === 0 ? MA.textMuted : MA.textSecondary,
                }}>
                {days} {isHe ? 'ימים' : 'days'}
                <span style={{
                  minWidth: 18, padding: '0 5px', borderRadius: 9999, fontSize: 10, fontWeight: 800,
                  fontFamily: MA.heading, lineHeight: '16px',
                  background: active ? 'rgba(74,222,128,.2)' : count === 0 ? 'rgba(13,26,18,.06)' : MA.successBg,
                  color: active ? MA.greenAccent : count === 0 ? MA.textMuted : MA.greenMain,
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: MA.textMuted }}>
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: MA.greenMain }} />
              {isHe ? 'מעדכן סיכום...' : 'Updating summary...'}</>
          ) : (
            <><RefreshCw style={{ width: 12, height: 12 }} />
              {isHe ? 'מתעדכן אוטומטית כשמתווספים נתונים' : 'Updates automatically when data changes'}
              {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString('he-IL')}`}</>
          )}
        </span>
      </div>

      {summary?.error && (
        <div style={{ borderRadius: 16, padding: '14px 18px', background: MA.warnBg }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MA.warn }}>השירות אינו זמין</p>
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

        </>
      )}

      {!summary && !generating && (() => {
        // Point at a window that actually has matches instead of dead-ending.
        const withData = RANGES.find(d => (counts[d] ?? 0) > 0);
        return (
          <div style={{ background: MA.card, borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: MA.cardShadow }}>
            <TrendingUp style={{ width: 44, height: 44, color: MA.textFaint, margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: MA.textPrimary }}>
              {isHe ? `אין משחקים ב-${timeRange} הימים האחרונים` : `No matches in the last ${timeRange} days`}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: MA.textMuted }}>
              {withData
                ? (isHe
                  ? `יש ${counts[withData]} משחקים ב-${withData} הימים האחרונים — בחר את התקופה הזו כדי לראות סיכום.`
                  : `There are ${counts[withData]} matches in the last ${withData} days — pick that period to see a summary.`)
                : (isHe
                  ? 'הוסף ניתוח משחק והסיכום ייווצר כאן מעצמו.'
                  : 'Add a match analysis and the summary will build itself here.')}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
