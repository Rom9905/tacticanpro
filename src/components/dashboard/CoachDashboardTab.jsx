import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Trophy, Handshake, ChevronLeft } from 'lucide-react';
import IssueCard from './IssueCard';
import { base44 } from '@/api/base44Client';

/* ── count-up hook (same pattern as KPICard) ── */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) { setVal(target); return; }
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVal(target); return; }
    const start = performance.now();
    const isFloat = !Number.isInteger(target);
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(isFloat ? +(target * e).toFixed(1) : Math.round(target * e));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

/* ── issue → pitch zone (attack direction: left; own goal: right) ── */
const ZONE_BY_CATEGORY = {
  'הגנה':          { top: '30%', right: '8%',  label: 'הרחבה שלנו' },
  'מצבים נייחים':  { top: '24%', right: '7%',  label: 'הרחבה שלנו' },
  'מצבים ניייחים': { top: '24%', right: '7%',  label: 'הרחבה שלנו' },
  'לחץ':           { top: '44%', right: '20%', label: 'שליש אחורי' },
  'מעברים':        { top: '70%', right: '46%', label: 'קישור' },
  'התקפה':         { top: '45%', right: '75%', label: 'שליש קדמי' },
  'כללי':          { top: '56%', right: '38%', label: 'מרכז המגרש' },
};
const PIN_COLOR = { critical: '#DC2626', high: '#D97706', medium: '#5C6B61', low: '#5C6B61' };
const SEVERITY_LABEL = { critical: 'חומרה גבוהה', high: 'בינונית-גבוהה', medium: 'בינונית', low: 'נמוכה' };

const heebo = { fontFamily: 'Heebo, sans-serif' };
const cream = (a) => `rgba(244,239,230,${a})`;

/* ── modals: identical behavior to the previous version ── */
function IssuesModal({ open, onClose, issues, onGoInsight, professionalSummaries, matchAnalyses }) {
  const { t, dir } = useLang();
  const db = t.dashboard;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)', maxWidth: '640px' }} dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base" style={{ color: '#B94040' }}>
            <AlertCircle className="w-5 h-5" /> {db.issuesCount} ({issues.length})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {issues.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#9A8672' }}>{db.noOpenIssues}</p>
          ) : issues.map(goal => (
            <IssueCard key={goal.id} issue={goal}
              professionalSummaries={professionalSummaries} matchAnalyses={matchAnalyses}
              onGoToTraining={() => { onGoInsight && onGoInsight('training_center'); onClose(); }}
              onGoToAnalysis={() => { onGoInsight && onGoInsight('match'); onClose(); }}
              compact={false} />
          ))}
        </div>
        <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
          <Button size="sm" variant="ghost" onClick={onClose} style={{ color: '#9A8672', fontSize: '12px' }}>{db.close}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopScorersModal({ open, onClose, players, type }) {
  const { t, dir } = useLang();
  const db = t.dashboard;
  const isGoals = type === 'goals';
  const sorted = [...(players || [])]
    .filter(p => isGoals ? (p.season_goals || 0) > 0 : (p.season_assists || 0) > 0)
    .sort((a, b) => isGoals ? (b.season_goals || 0) - (a.season_goals || 0) : (b.season_assists || 0) - (a.season_assists || 0))
    .slice(0, 5);
  const color = isGoals ? '#2A7050' : '#2A5FA8';
  const Icon = isGoals ? Trophy : Handshake;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)', maxWidth: '420px' }} dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base" style={{ color }}>
            <Icon className="w-5 h-5" /> {isGoals ? db.topScorers : db.topAssisters}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#9A8672' }}>{db.noData}</p>
          ) : sorted.map((p, i) => {
            const val = isGoals ? p.season_goals : p.season_assists;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: i === 0 ? `${color}12` : 'rgba(139,115,85,0.06)', border: `1px solid ${i === 0 ? `${color}30` : 'rgba(139,115,85,0.14)'}` }}>
                <span className="text-lg w-6 text-center">{medals[i] || `${i + 1}.`}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#2C2416' }}>{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.position && <span className="text-[10px]" style={{ color: '#9A8672' }}>{p.position}</span>}
                    {p.number && <span className="text-[10px]" style={{ color: '#9A8672' }}>#{p.number}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold" style={{ color }}>{val}</span>
                  <span className="text-[10px]" style={{ color: '#9A8672' }}>{isGoals ? db.goals : db.assists}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
          <Button size="sm" variant="ghost" onClick={onClose} style={{ color: '#9A8672', fontSize: '12px' }}>{db.close}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CoachDashboardTab({
  dashboardData, upcomingGames: _upcomingGames, needsSummaryEvents, players, matchAnalyses,
  tacticalGoals, professionalSummaries, onGoInsight, onFillSummary
}) {
  const { t, dir } = useLang();
  const db = t.dashboard;
  const [modal, setModal] = useState(null);
  const [hoverIssue, setHoverIssue] = useState(null);
  const [gameStyleLastUpdated, setGameStyleLastUpdated] = useState(null);

  useEffect(() => {
    if (dashboardData?.teamId) {
      base44.entities.Team.filter({ id: dashboardData.teamId }).then(teams => {
        if (teams[0]) setGameStyleLastUpdated(teams[0].updated_date || null);
      });
    }
  }, [dashboardData?.teamId]);

  /* ── all data derivations: identical to the previous version ── */
  const summaryMatches = (professionalSummaries || []).filter(s => s.event_type === 'match');
  const analyses = matchAnalyses || [];
  const mergedForStats = analyses.map(a => {
    const linked = a.summary_id
      ? summaryMatches.find(s => s.id === a.summary_id)
      : summaryMatches.find(s => s.event_date === a.date && (s.event_label || '').includes(a.opponent || ''));
    return { ...a, _summary: linked || null };
  });
  const usedSummaryIds = new Set(mergedForStats.map(a => a.summary_id).filter(Boolean));
  const summaryOnlyItems = summaryMatches.filter(s => !usedSummaryIds.has(s.id))
    .map(s => ({ _summary: s, result: s.result_our != null ? { our_score: s.result_our, opponent_score: s.result_opponent } : null }));
  const allMatchItems = [...mergedForStats, ...summaryOnlyItems];
  const getOur = it => it._summary?.result_our ?? it.result?.our_score;
  const getOpp = it => it._summary?.result_opponent ?? it.result?.opponent_score;
  const withResults = allMatchItems.filter(it => getOur(it) != null);
  const wins = withResults.filter(it => getOur(it) > getOpp(it)).length;
  const draws = withResults.filter(it => getOur(it) === getOpp(it)).length;
  const losses = withResults.filter(it => getOur(it) < getOpp(it)).length;
  const total = wins + draws + losses || 1;
  const winPct = Math.round((wins / total) * 100);
  const hasResults = withResults.length > 0;
  const last5 = withResults.slice(0, 5).map(it => getOur(it) > getOpp(it) ? 'W' : getOur(it) === getOpp(it) ? 'D' : 'L');

  const matchesWithGoals = withResults.filter(m => getOur(m) != null && getOpp(m) != null);
  const avgScored = matchesWithGoals.length ? (matchesWithGoals.reduce((s, m) => s + getOur(m), 0) / matchesWithGoals.length).toFixed(1) : null;
  const avgConceded = matchesWithGoals.length ? (matchesWithGoals.reduce((s, m) => s + getOpp(m), 0) / matchesWithGoals.length).toFixed(1) : null;

  const topScorer = [...(players || [])].sort((a, b) => (b.season_goals || 0) - (a.season_goals || 0))[0];
  const topAssister = [...(players || [])].sort((a, b) => (b.season_assists || 0) - (a.season_assists || 0))[0];
  const unavailablePlayers = (players || []).filter(p => p.availability === 'פצוע' || p.availability === 'מושעה' || p.availability === 'לא זמין');
  const availablePlayers = (players || []).filter(p => !unavailablePlayers.includes(p));

  const openIssuesList = (tacticalGoals || []).filter(g => g.status === 'active')
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 2) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 2));
  const pitchIssues = [...openIssuesList].sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0)).slice(0, 3);

  const gameStyleIsStale = gameStyleLastUpdated &&
    (Date.now() - new Date(gameStyleLastUpdated).getTime()) / 86400000 > 30;

  const nextGame = dashboardData?.nextGame;
  const nextGameDate = nextGame ? new Date(nextGame.game_date) : null;
  const daysToGame = nextGameDate ? Math.max(0, Math.ceil((nextGameDate - Date.now()) / 86400000)) : null;

  /* coach notes (highlights) */
  const notes = [];
  const criticalGoal = openIssuesList.find(g => g.priority === 'critical' || g.priority === 'high');
  if (criticalGoal) notes.push({ color: '#E06C6C', text: `"${criticalGoal.title}" ${criticalGoal.occurrence_count > 0 ? `חזרה ${criticalGoal.occurrence_count}× — ` : '— '}לתעדף באימון הקרוב`, link: 'training_center' });
  if (gameStyleIsStale) notes.push({ color: '#D9A93F', text: 'שיטת המשחק לא עודכנה מעל חודש — לבדוק לפני המשחק הבא', link: 'team' });
  if (unavailablePlayers.length > 0) notes.push({ color: '#4ADE80', text: `${unavailablePlayers.length} שחקנים לא זמינים — להכין חלופות`, link: 'team' });
  if (topScorer?.season_goals > 0) notes.push({ color: '#4ADE80', text: `${topScorer.name} מוביל עם ${topScorer.season_goals} שערים`, link: 'team' });

  const animOn = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cWins = useCountUp(wins), cDraws = useCountUp(draws), cLosses = useCountUp(losses), cPct = useCountUp(winPct);

  if (!dashboardData) return null;

  const jersey = (p, i) => {
    const out = unavailablePlayers.includes(p);
    const reason = p.availability && p.availability !== 'זמין' ? p.availability : '';
    return (
      <span key={p.id || i} title={`${p.name}${reason ? ` — ${reason}` : ''}`}
        style={{
          width: 27, height: 31, borderRadius: '6px 6px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...heebo, fontWeight: 800, fontSize: 10,
          ...(out
            ? { background: p.availability === 'פצוע' ? 'rgba(220,38,38,.12)' : 'rgba(217,119,6,.12)', border: `1.5px dashed ${p.availability === 'פצוע' ? '#E06C6C' : '#D9A93F'}`, color: p.availability === 'פצוע' ? '#FF8A8A' : '#F5C97A' }
            : { background: 'linear-gradient(180deg,#16A34A,#0F6E31)', color: '#fff' })
        }}>
        {p.number || '?'}
      </span>
    );
  };

  return (
    <div dir={dir} className="rounded-2xl overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse 70% 45% at 50% -5%, #12301D 0%, #060D08 60%)', border: '1px solid rgba(74,222,128,.2)' }}>
      {/* floodlights */}
      {animOn && <>
        <div style={{ position: 'absolute', top: 0, right: '6%', width: 300, height: 460, background: 'linear-gradient(195deg, rgba(74,222,128,.13), transparent 65%)', clipPath: 'polygon(45% 0,55% 0,100% 100%,0 100%)', pointerEvents: 'none', animation: 'sdGlowSweep 5s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: 0, left: '6%', width: 300, height: 460, background: 'linear-gradient(165deg, rgba(74,222,128,.13), transparent 65%)', clipPath: 'polygon(45% 0,55% 0,100% 100%,0 100%)', pointerEvents: 'none', animation: 'sdGlowSweep 5s 2.5s ease-in-out infinite' }} />
      </>}

      <div className="relative p-4 md:p-6 flex flex-col gap-5">
        {/* ── hanging scoreboard ── */}
        <div className="flex justify-center">
          <div className="relative mt-5">
            <div style={{ position: 'absolute', top: -22, right: '18%', width: 2, height: 22, background: `linear-gradient(180deg, transparent, rgba(74,222,128,.5))` }} />
            <div style={{ position: 'absolute', top: -22, left: '18%', width: 2, height: 22, background: `linear-gradient(180deg, transparent, rgba(74,222,128,.5))` }} />
            <div className="flex flex-wrap items-center justify-center gap-5 md:gap-6"
              style={{ background: '#08110B', border: '1px solid rgba(74,222,128,.35)', borderRadius: 16, boxShadow: '0 0 40px rgba(74,222,128,.18), inset 0 -20px 40px rgba(0,0,0,.6)', padding: '14px 22px' }}>
              {hasResults ? (
                <div className="text-center">
                  <div style={{ fontSize: 10, letterSpacing: '.25em', color: cream(.4), marginBottom: 6 }}>{db.seasonBalance}</div>
                  <div className="flex items-center gap-3">
                    {[{ v: cWins, l: db.wins, c: '#4ADE80' }, { v: cDraws, l: db.draws, c: '#D9A93F' }, { v: cLosses, l: db.losses, c: '#E06C6C' }].map((x, i) => (
                      <React.Fragment key={x.l}>
                        {i > 0 && <span style={{ color: cream(.2), fontSize: 24, marginTop: -12 }}>:</span>}
                        <div className="text-center">
                          <span style={{ ...heebo, fontWeight: 900, fontSize: 36, color: x.c, lineHeight: 1, textShadow: `0 0 18px ${x.c}99` }}>{x.v}</span>
                          <div style={{ fontSize: 10, color: cream(.45), marginTop: 2 }}>{x.l}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: cream(.55) }}>עדיין אין תוצאות העונה — הלוח יידלק אחרי המשחק הראשון.</p>
              )}
              {hasResults && <>
                <div className="hidden md:block self-stretch" style={{ width: 1, background: 'rgba(74,222,128,.15)' }} />
                <div className="relative" style={{ width: 82, height: 82 }}>
                  <svg width="82" height="82" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke={cream(.08)} strokeWidth="10" />
                    <circle className={animOn ? 'sd-ring' : ''} cx="60" cy="60" r="54" fill="none" stroke="#4ADE80" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray="339" strokeDashoffset={339 * (1 - winPct / 100)} transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ ...heebo, fontWeight: 900, fontSize: 20, color: '#F4EFE6', lineHeight: 1 }}>{cPct}%</span>
                    <span style={{ fontSize: 8.5, color: cream(.45) }}>{db.wins}</span>
                  </div>
                </div>
                <div className="hidden md:block self-stretch" style={{ width: 1, background: 'rgba(74,222,128,.15)' }} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '.2em', color: cream(.4), marginBottom: 8, textAlign: 'center' }}>{db.last5results}</div>
                  <div className="flex gap-1.5 justify-center">
                    {last5.map((r, i) => (
                      <span key={i} style={{
                        width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...heebo, fontWeight: 800, fontSize: 12,
                        background: r === 'W' ? '#4ADE80' : r === 'D' ? '#D9A93F' : '#E06C6C',
                        color: r === 'L' ? '#F4EFE6' : '#0D1A12',
                        boxShadow: i === last5.length - 1 ? '0 0 12px rgba(74,222,128,.5)' : 'none'
                      }}>{r}</span>
                    ))}
                  </div>
                  <div className="flex gap-2.5 mt-2 justify-center" style={{ fontSize: 10.5, color: cream(.45) }}>
                    {avgScored && <span>⚽ {avgScored} {db.scored}</span>}
                    {avgConceded && <span>🥅 {avgConceded} {db.conceded}</span>}
                  </div>
                </div>
              </>}
            </div>
          </div>
        </div>

        {/* ── stage: pitch + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div>
            {/* 3D pitch */}
            <div style={{ perspective: 1200, paddingTop: 26 }}>
              <div style={{ position: 'relative', transform: 'rotateX(38deg)', transformStyle: 'preserve-3d', borderRadius: 18, background: 'linear-gradient(180deg, #1A5C33, #124326)', boxShadow: '0 40px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(74,222,128,.25), 0 0 60px rgba(74,222,128,.1)', margin: '0 8px' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 12.5%, transparent 12.5% 25%)' }} />
                <svg viewBox="0 0 600 380" style={{ display: 'block', width: '100%', height: 'auto', position: 'relative' }}>
                  <g stroke="rgba(255,255,255,.6)" strokeWidth="2" fill="none">
                    <rect x="14" y="14" width="572" height="352" rx="4" />
                    <line x1="300" y1="14" x2="300" y2="366" />
                    <circle cx="300" cy="190" r="52" />
                    <circle cx="300" cy="190" r="3" fill="rgba(255,255,255,.6)" />
                    <rect x="14" y="96" width="88" height="188" /><rect x="14" y="146" width="36" height="88" />
                    <rect x="498" y="96" width="88" height="188" /><rect x="550" y="146" width="36" height="88" />
                    <path d="M102 152 A 52 52 0 0 1 102 228" /><path d="M498 152 A 52 52 0 0 0 498 228" />
                  </g>
                </svg>
                {pitchIssues.map((issue, i) => {
                  const zone = ZONE_BY_CATEGORY[issue.category] || ZONE_BY_CATEGORY['כללי'];
                  const color = PIN_COLOR[issue.priority] || '#5C6B61';
                  const hot = hoverIssue === issue.id;
                  return (
                    <React.Fragment key={issue.id}>
                      <div style={{ position: 'absolute', top: zone.top, right: zone.right, width: 130, height: 96, transform: 'translate(50%,-50%)', background: `radial-gradient(ellipse, ${color}${hot ? '80' : '55'}, transparent 70%)`, borderRadius: '50%', transition: 'background 200ms' }} />
                      <div className={animOn ? 'sd-pin' : ''} style={{ position: 'absolute', top: zone.top, right: zone.right, transformOrigin: 'bottom center', animationDelay: `${.2 + i * .2}s`, transform: 'rotateX(-38deg)', cursor: 'pointer' }}
                        onMouseEnter={() => setHoverIssue(issue.id)} onMouseLeave={() => setHoverIssue(null)}
                        onClick={() => setModal('issues')}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-100%)' }}>
                          <div style={{ background: color, color: '#fff', borderRadius: 12, padding: '5px 11px', ...heebo, fontWeight: 900, fontSize: hot ? 16 : 14, boxShadow: `0 8px 20px ${color}80`, whiteSpace: 'nowrap', transition: 'font-size 150ms' }}>
                            {i + 1}{issue.occurrence_count > 0 ? ` · ${issue.occurrence_count}×` : ''}
                          </div>
                          <div style={{ width: 3, height: 22, background: `linear-gradient(180deg, ${color}, ${color}33)` }} />
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            {/* legend */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ width: 4, height: 16, borderRadius: 2, background: '#DC2626' }} />
                <span style={{ ...heebo, fontWeight: 800, fontSize: 15, color: '#F4EFE6' }}>מפת הבעיות · לפי אזור במגרש</span>
                {openIssuesList.length > 0 && (
                  <button onClick={() => setModal('issues')} style={{ fontSize: 11, fontWeight: 700, background: 'rgba(220,38,38,.18)', color: '#FF8A8A', borderRadius: 9999, padding: '2px 10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {openIssuesList.length} פתוחות — {db.clickForDetails}
                  </button>
                )}
                <span style={{ fontSize: 11, color: cream(.4), marginRight: 'auto' }}>כיוון התקפה ←</span>
              </div>
              {pitchIssues.length === 0 && (
                <p style={{ fontSize: 13, color: cream(.55), padding: '8px 4px' }}>{db.allGood} — אין בעיות פתוחות על המגרש 🎉</p>
              )}
              {pitchIssues.map((issue, i) => {
                const zone = ZONE_BY_CATEGORY[issue.category] || ZONE_BY_CATEGORY['כללי'];
                const color = PIN_COLOR[issue.priority] || '#5C6B61';
                const hot = hoverIssue === issue.id;
                return (
                  <div key={issue.id} className={animOn ? 'sd-fade' : ''}
                    onMouseEnter={() => setHoverIssue(issue.id)} onMouseLeave={() => setHoverIssue(null)}
                    style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '11px 13px', borderRadius: 12, background: `${color}${hot ? '2E' : '1A'}`, border: `1px solid ${color}${hot ? '80' : '4D'}`, animationDelay: `${.3 + i * .1}s`, transition: 'background 200ms, border-color 200ms' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...heebo, fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <b style={{ fontSize: 13.5, color: '#F4EFE6' }}>{issue.title}</b>
                      <span style={{ fontSize: 11.5, color: cream(.5) }}> · {zone.label}{issue.occurrence_count > 0 ? ` · זוהתה ${issue.occurrence_count}×` : ''} · {SEVERITY_LABEL[issue.priority] || SEVERITY_LABEL.medium}</span>
                    </div>
                    <button onClick={() => onGoInsight && onGoInsight('training_center')}
                      style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', flexShrink: 0, cursor: 'pointer' }}>
                      טפל באימון ←
                    </button>
                  </div>
                );
              })}
              {needsSummaryEvents?.length > 0 && (
                <div className="flex items-center justify-between gap-2 flex-wrap" style={{ padding: '9px 12px', borderRadius: 10, border: `1px dashed ${cream(.2)}` }}>
                  <span style={{ fontSize: 12, color: cream(.6) }}>⏳ {needsSummaryEvents.length} {db.pendingSummary} — המפה תתעדכן אחרי הסיכום</span>
                  <button onClick={() => onFillSummary?.()} style={{ background: 'none', border: 'none', color: '#4ADE80', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{db.clickToSummarize} ←</button>
                </div>
              )}
            </div>
          </div>

          {/* ── sidebar ── */}
          <div className="flex flex-col gap-3.5 lg:mt-6">
            {/* matchday ticket */}
            {nextGameDate && (
              <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #12251A, #0A130D)', border: '1px solid rgba(74,222,128,.35)', borderRadius: 16, padding: '15px 17px', boxShadow: '0 0 30px rgba(74,222,128,.1)' }}>
                <div style={{ position: 'absolute', left: -11, top: '56%', width: 22, height: 22, borderRadius: '50%', background: '#060D08', border: '1px solid rgba(74,222,128,.3)' }} />
                <div style={{ position: 'absolute', right: -11, top: '56%', width: 22, height: 22, borderRadius: '50%', background: '#060D08', border: '1px solid rgba(74,222,128,.3)' }} />
                <div className="flex justify-between items-center mb-3">
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#4ADE80', letterSpacing: '.15em' }}>MATCHDAY · {db.nextGame}</span>
                  {nextGame.context && <span style={{ fontSize: 11, color: cream(.5) }}>{nextGame.context}{nextGame.location ? ` · ${nextGame.location}` : ''}</span>}
                </div>
                <div className="flex items-center justify-between gap-2 pb-3" style={{ borderBottom: `1px dashed ${cream(.2)}` }}>
                  <div className="text-center flex-1">
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#4ADE80', color: '#0D1A12', display: 'flex', alignItems: 'center', justifyContent: 'center', ...heebo, fontWeight: 900, fontSize: 16, margin: '0 auto 5px' }}>⚽</div>
                    <span style={{ fontSize: 11.5, color: '#F4EFE6', fontWeight: 700 }}>הקבוצה שלנו</span>
                  </div>
                  <div className="text-center">
                    <div style={{ ...heebo, fontWeight: 900, fontSize: 17, color: cream(.9) }}>VS</div>
                    {daysToGame != null && <div style={{ fontSize: 10, color: '#4ADE80', fontWeight: 700, marginTop: 2 }}>{daysToGame === 0 ? 'היום!' : `בעוד ${daysToGame} ימים`}</div>}
                  </div>
                  <div className="text-center flex-1">
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: cream(.12), color: '#F4EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center', ...heebo, fontWeight: 900, fontSize: 16, margin: '0 auto 5px' }}>{(nextGame.opponent || '?').charAt(0)}</div>
                    <span style={{ fontSize: 11.5, color: '#F4EFE6', fontWeight: 700 }}>{nextGame.opponent}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span style={{ fontSize: 11.5, color: cream(.6) }}>
                    {nextGameDate.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    {' · '}{nextGameDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => onGoInsight && onGoInsight('training_center')}
                    style={{ background: '#4ADE80', color: '#0D1A12', border: 'none', borderRadius: 9, padding: '7px 14px', ...heebo, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                    הכנה למשחק ←
                  </button>
                </div>
              </div>
            )}

            {/* bench */}
            {players?.length > 0 && (
              <div style={{ background: cream(.04), border: `1px solid ${cream(.1)}`, borderRadius: 16, padding: '14px 16px' }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span style={{ ...heebo, fontWeight: 800, fontSize: 13.5, color: '#F4EFE6' }}>הספסל · {db.squadStatus}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>{availablePlayers.length}<span style={{ color: cream(.4), fontWeight: 600 }}>/{players.length}</span></span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...availablePlayers, ...unavailablePlayers].map(jersey)}
                </div>
                <div className="flex flex-col gap-1 mt-2.5" style={{ fontSize: 11, color: cream(.5) }}>
                  {unavailablePlayers.length > 0 && (
                    <span>{unavailablePlayers.map(p => `▨ ${p.name} — ${p.availability}`).join(' · ')}</span>
                  )}
                  <button onClick={() => onGoInsight && onGoInsight('team')}
                    style={{ background: 'none', border: 'none', color: '#4ADE80', fontWeight: 700, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'start' }}>
                    {db.manageSquad} ←
                  </button>
                </div>
              </div>
            )}

            {/* player cards */}
            {(topScorer?.season_goals > 0 || topAssister?.season_assists > 0) && (
              <div className="flex gap-2.5">
                {topScorer?.season_goals > 0 && (
                  <button onClick={() => setModal('scorers')} className="flex-1 relative text-center"
                    style={{ background: 'linear-gradient(165deg, #14361F, #0A130D)', border: '1px solid rgba(74,222,128,.35)', borderRadius: 14, padding: '13px 11px', transform: 'rotate(-1.5deg)', boxShadow: '0 8px 24px rgba(0,0,0,.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ position: 'absolute', top: 7, right: 9, fontSize: 12 }}>👑</span>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#4ADE80', color: '#0D1A12', display: 'flex', alignItems: 'center', justifyContent: 'center', ...heebo, fontWeight: 900, fontSize: 16, margin: '0 auto 5px', border: `2px solid ${cream(.3)}` }}>{topScorer.name?.charAt(0)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F4EFE6' }}>{topScorer.name}</div>
                    <div style={{ ...heebo, fontWeight: 900, fontSize: 28, color: '#4ADE80', lineHeight: 1.1, textShadow: '0 0 14px rgba(74,222,128,.5)' }}>{topScorer.season_goals}</div>
                    <div style={{ fontSize: 9.5, color: cream(.5) }}>{db.goals} · {db.topScorer}</div>
                  </button>
                )}
                {topAssister?.season_assists > 0 && (
                  <button onClick={() => setModal('assisters')} className="flex-1 relative text-center"
                    style={{ background: 'linear-gradient(165deg, #12233B, #0A130D)', border: '1px solid rgba(96,165,250,.35)', borderRadius: 14, padding: '13px 11px', transform: 'rotate(1.5deg)', boxShadow: '0 8px 24px rgba(0,0,0,.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ position: 'absolute', top: 7, right: 9, fontSize: 12 }}>🎯</span>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#60A5FA', color: '#0D1A12', display: 'flex', alignItems: 'center', justifyContent: 'center', ...heebo, fontWeight: 900, fontSize: 16, margin: '0 auto 5px', border: `2px solid ${cream(.3)}` }}>{topAssister.name?.charAt(0)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F4EFE6' }}>{topAssister.name}</div>
                    <div style={{ ...heebo, fontWeight: 900, fontSize: 28, color: '#60A5FA', lineHeight: 1.1, textShadow: '0 0 14px rgba(96,165,250,.5)' }}>{topAssister.season_assists}</div>
                    <div style={{ fontSize: 9.5, color: cream(.5) }}>{db.assists} · {db.topAssister}</div>
                  </button>
                )}
              </div>
            )}

            {/* coach notes */}
            {notes.length > 0 && (
              <div style={{ background: cream(.04), border: `1px solid ${cream(.1)}`, borderRadius: 16, padding: '14px 16px' }} className="flex flex-col gap-2">
                <span style={{ ...heebo, fontWeight: 800, fontSize: 13.5, color: '#F4EFE6' }}>📋 {db.coachHighlights}</span>
                {notes.slice(0, 4).map((n, i) => (
                  <div key={i} className="flex items-center justify-between gap-2"
                    style={{ fontSize: 12, color: cream(.75), lineHeight: 1.6, padding: '8px 10px', borderRadius: 9, background: cream(.04), borderRight: `2px solid ${n.color}` }}>
                    <span className="flex-1">{n.text}</span>
                    {n.link && (
                      <button onClick={() => onGoInsight && onGoInsight(n.link)}
                        style={{ background: 'none', border: 'none', color: '#4ADE80', fontWeight: 700, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {db.details} <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* modals */}
      <IssuesModal open={modal === 'issues'} onClose={() => setModal(null)} issues={openIssuesList}
        onGoInsight={onGoInsight} professionalSummaries={professionalSummaries} matchAnalyses={matchAnalyses} />
      <TopScorersModal open={modal === 'scorers'} onClose={() => setModal(null)} players={players} type="goals" />
      <TopScorersModal open={modal === 'assisters'} onClose={() => setModal(null)} players={players} type="assists" />
    </div>
  );
}
