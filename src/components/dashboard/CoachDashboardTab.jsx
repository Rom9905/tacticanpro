import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle, Activity, TrendingUp, Target, Users, Zap, ChevronRight,
  Clock, CheckCircle2, AlertTriangle, Star, Trophy, Handshake, Settings
} from 'lucide-react';
import IssueCard from './IssueCard';
import KPICard from './KPICard';
import { base44 } from '@/api/base44Client';

function _getUrgencyColor(sev) {
  if (sev === 'critical') return { bg: 'rgba(200,50,50,0.08)', border: 'rgba(200,50,50,0.28)', badge: '#B94040' };
  if (sev === 'high') return { bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.28)', badge: '#D97706' };
  return { bg: 'rgba(139,115,85,0.06)', border: 'rgba(139,115,85,0.20)', badge: '#9A8672' };
}

const _SOURCE_LABELS = { match: 'ניתוח משחק', training: 'אימון', manual: 'הוזן ידנית' };
const _CATEGORY_LABELS = { התקפה: 'התקפה', הגנה: 'הגנה', מעברים: 'מעברים', 'מצבים ניייחים': 'מצבים נייחים', לחץ: 'לחץ', כללי: 'כללי' };

function IssuesModal({ open, onClose, issues, onGoInsight, professionalSummaries }) {
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
            <IssueCard
              key={goal.id}
              issue={goal}
              professionalSummaries={professionalSummaries}
              onGoToTraining={() => { onGoInsight && onGoInsight('training_center'); onClose(); }}
              onGoToAnalysis={() => { onGoInsight && onGoInsight('match'); onClose(); }}
              compact={false}
            />
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
  const sorted = [...(players || [])]
    .filter(p => type === 'goals' ? (p.season_goals || 0) > 0 : (p.season_assists || 0) > 0)
    .sort((a, b) => type === 'goals' ? (b.season_goals || 0) - (a.season_goals || 0) : (b.season_assists || 0) - (a.season_assists || 0))
    .slice(0, 5);

  const isGoals = type === 'goals';
  const title = isGoals ? db.topScorers : db.topAssisters;
  const icon = isGoals ? Trophy : Handshake;
  const color = isGoals ? '#2A7050' : '#2A5FA8';
  const Icon = icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)', maxWidth: '420px' }} dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base" style={{ color }}>
            <Icon className="w-5 h-5" /> {title}
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
  tacticalGoals, professionalSummaries,
  onGoInsight, onFillSummary
}) {
  const { t, dir } = useLang();
  const db = t.dashboard;
  const [modal, setModal] = useState(null); // 'issues' | 'scorers' | 'assisters'
  const [_teamGameStyle, setTeamGameStyle] = useState(null);
  const [gameStyleLastUpdated, setGameStyleLastUpdated] = useState(null);

  // Load team game style for dashboard context
  useEffect(() => {
    if (dashboardData?.teamId) {
      base44.entities.Team.filter({ id: dashboardData.teamId }).then(teams => {
        const team = teams[0];
        if (team) {
          setTeamGameStyle(team.game_style || null);
          setGameStyleLastUpdated(team.updated_date || null);
        }
      });
    }
  }, [dashboardData?.teamId]);

  if (!dashboardData) return null;

  // Check if game style is stale (> 30 days)
  const gameStyleIsStale = gameStyleLastUpdated && (() => {
    const lastUpdate = new Date(gameStyleLastUpdated);
    const daysDiff = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 30;
  })();

  // Recurring issues (occurrence_count >= 3) linked to game style
  const recurringGameStyleIssues = (tacticalGoals || []).filter(g =>
    g.status === 'active' && g.occurrence_count >= 3
  );

  const { nextGame } = dashboardData;

  // --- Win/Draw/Loss: same merged logic as MatchAnalysis page ---
  // Primary source: ProfessionalSummary. Fallback: MatchAnalysis.result (for analyses with no linked summary).
  const summaryMatches = (professionalSummaries || []).filter(s => s.event_type === 'match');
  const analyses = matchAnalyses || [];

  const mergedForStats = analyses.map(a => {
    const linked = a.summary_id
      ? summaryMatches.find(s => s.id === a.summary_id)
      : summaryMatches.find(s => s.event_date === a.date && (s.event_label || '').includes(a.opponent || ''));
    return { ...a, _summary: linked || null };
  });

  const usedSummaryIds = new Set(mergedForStats.map(a => a.summary_id).filter(Boolean));
  const summaryOnlyItems = summaryMatches
    .filter(s => !usedSummaryIds.has(s.id))
    .map(s => ({ _summary: s, result: s.result_our != null ? { our_score: s.result_our, opponent_score: s.result_opponent } : null }));

  const allMatchItems = [...mergedForStats, ...summaryOnlyItems];

  const getOur = item => item._summary?.result_our ?? item.result?.our_score;
  const getOpp = item => item._summary?.result_opponent ?? item.result?.opponent_score;

  const withResults = allMatchItems.filter(item => getOur(item) != null);
  const wins = withResults.filter(item => getOur(item) > getOpp(item)).length;
  const draws = withResults.filter(item => getOur(item) === getOpp(item)).length;
  const losses = withResults.filter(item => getOur(item) < getOpp(item)).length;
  const hasResults = withResults.length > 0;

  const last5 = withResults.slice(0, 5).map(item => {
    const our = getOur(item), opp = getOpp(item);
    if (our > opp) return { char: 'W' };
    if (our === opp) return { char: 'D' };
    return { char: 'L' };
  });

  // Top scorer / top assister
  const topScorer = [...(players || [])].sort((a, b) => (b.season_goals || 0) - (a.season_goals || 0))[0];
  const topAssister = [...(players || [])].sort((a, b) => (b.season_assists || 0) - (a.season_assists || 0))[0];

  // Players not available
  const unavailablePlayers = (players || []).filter(p =>
    p.availability === 'פצוע' || p.availability === 'מושעה' || p.availability === 'לא זמין'
  );

  // Open issues from TacticalGoal
  const openIssuesList = (tacticalGoals || [])
    .filter(g => g.status === 'active')
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    })
;

  // Weekly highlights
  const highlights = [];
  const criticalGoal = openIssuesList.find(g => g.priority === 'critical' || g.priority === 'high');
  if (criticalGoal) highlights.push({ text: t.lang === 'he' ? `בעיה פתוחה: "${criticalGoal.title}" ${criticalGoal.occurrence_count > 0 ? `(${criticalGoal.occurrence_count}× זוהתה)` : ''}` : `Open issue: "${criticalGoal.title}" ${criticalGoal.occurrence_count > 0 ? `(${criticalGoal.occurrence_count}× detected)` : ''}`, icon: AlertCircle, color: '#B94040', link: 'training_center' });
  if (needsSummaryEvents?.length > 0) highlights.push({ text: t.lang === 'he' ? `${needsSummaryEvents.length} אירועים ממתינים לסיכום` : `${needsSummaryEvents.length} events awaiting summary`, icon: Clock, color: '#D97706', link: null });
  if (topScorer?.season_goals > 0) highlights.push({ text: t.lang === 'he' ? `${topScorer.name} מוביל עם ${topScorer.season_goals} שערים` : `${topScorer.name} leads with ${topScorer.season_goals} goals`, icon: Star, color: '#2A7050', link: 'team' });
  if (unavailablePlayers.length > 0) highlights.push({ text: t.lang === 'he' ? `${unavailablePlayers.length} שחקנים לא זמינים למשחק הבא` : `${unavailablePlayers.length} players unavailable for next game`, icon: AlertTriangle, color: '#D97706', link: 'team' });

  const nextGameDate = nextGame ? new Date(nextGame.game_date) : null;

  return (
    <div className="space-y-4" dir={dir}>
      {/* ── Hero: season overview (dark strip) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D1A12 0%, #12251A 100%)', border: '1px solid rgba(74,222,128,0.15)' }}
      >
        <div className="px-5 pt-5 pb-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#F4EFE6', fontFamily: 'Heebo, sans-serif' }}>
                {t.lang === 'he' ? 'תמונת מצב' : 'Status'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(244,239,230,0.55)' }}>{db.seasonBalance}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 md:px-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          {hasResults ? (() => {
            const total = wins + draws + losses || 1;
            const winPct = Math.round((wins / total) * 100);
            return (
              <>
                {/* Win % + W/D/L */}
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <div className="font-bold leading-none" style={{ fontSize: '52px', fontFamily: 'Heebo, sans-serif', fontWeight: 900, color: '#4ADE80', fontVariantNumeric: 'tabular-nums' }}>{winPct}%</div>
                    <div className="text-[11px] mt-1.5" style={{ color: 'rgba(244,239,230,0.55)' }}>{db.wins}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { n: wins, l: 'W', c: '#4ADE80', tc: '#0D1A12' },
                      { n: draws, l: 'D', c: '#D9A93F', tc: '#0D1A12' },
                      { n: losses, l: 'L', c: '#E06C6C', tc: '#0D1A12' },
                    ].map(x => (
                      <div key={x.l} className="flex flex-col items-center">
                        <div className="rounded-xl flex items-center justify-center font-bold"
                          style={{ width: '44px', height: '44px', backgroundColor: `${x.c}1F`, border: `1px solid ${x.c}55`, color: x.c, fontSize: '17px', fontVariantNumeric: 'tabular-nums' }}>
                          {x.n}
                        </div>
                        <span className="text-[10px] mt-1" style={{ color: 'rgba(244,239,230,0.45)' }}>{x.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar + last 5 form */}
                <div className="flex-1 min-w-0">
                  <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,239,230,0.10)' }}>
                    <div style={{ width: `${(wins / total) * 100}%`, backgroundColor: '#4ADE80' }} />
                    <div style={{ width: `${(draws / total) * 100}%`, backgroundColor: '#D9A93F' }} />
                    <div style={{ width: `${(losses / total) * 100}%`, backgroundColor: '#E06C6C' }} />
                  </div>
                  {last5.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[11px]" style={{ color: 'rgba(244,239,230,0.45)' }}>{db.last5results}</span>
                      <div className="flex gap-1.5">
                        {last5.map((r, i) => (
                          <span key={i} className="rounded-full flex items-center justify-center font-bold"
                            style={{
                              width: '26px', height: '26px', fontSize: '11px',
                              backgroundColor: r.char === 'W' ? '#4ADE80' : r.char === 'D' ? '#D9A93F' : '#E06C6C',
                              color: '#0D1A12',
                            }}>
                            {r.char}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })() : (
            <p className="text-sm" style={{ color: 'rgba(244,239,230,0.55)' }}>
              {t.lang === 'he' ? 'עדיין אין תוצאות העונה — התמונה תתמלא אחרי המשחק הראשון.' : 'No results yet — the picture fills in after the first match.'}
            </p>
          )}

          {/* Next game */}
          {nextGameDate && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 md:mr-auto"
              style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)' }}>
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
                style={{ backgroundColor: 'rgba(74,222,128,0.14)' }}>
                <span className="text-sm font-bold leading-none" style={{ color: '#4ADE80', fontVariantNumeric: 'tabular-nums' }}>
                  {nextGameDate.toLocaleDateString(t.lang === 'he' ? 'he-IL' : 'en-US', { day: '2-digit' })}
                </span>
                <span className="text-[10px] mt-0.5" style={{ color: '#4ADE80' }}>
                  {nextGameDate.toLocaleDateString(t.lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })}
                </span>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: 'rgba(244,239,230,0.55)' }}>{db.nextGame}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: '#F4EFE6' }}>{db.vs} {nextGame.opponent}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Open Issues */}
        <KPICard
          icon={AlertCircle}
          label={db.openIssues}
          value={openIssuesList.length}
          onClick={openIssuesList.length > 0 ? () => setModal('issues') : undefined}
          semantic="warning"
          detailLabel={db.clickForDetails}
          detailLabelMissing={db.allGood}
        />
        {/* Pending Summary */}
        <KPICard
          icon={Clock}
          label={db.pendingSummary}
          value={needsSummaryEvents?.length || 0}
          onClick={needsSummaryEvents?.length > 0 ? () => onFillSummary?.() : undefined}
          semantic="info"
          detailLabel={db.clickToSummarize}
          detailLabelMissing={db.upToDate}
        />
        {/* Top Scorer */}
        {(topScorer?.season_goals > 0) && (
          <KPICard
            icon={Star}
            label={db.topScorer}
            value={topScorer.season_goals}
            onClick={() => setModal('scorers')}
            semantic="success"
            detailLabel={topScorer.name}
            detailLabelMissing={topScorer.name}
          />
        )}
        {/* Top Assister */}
        {(topAssister?.season_assists > 0) && (
          <KPICard
            icon={Activity}
            label={db.topAssister}
            value={topAssister.season_assists}
            onClick={() => setModal('assisters')}
            semantic="success"
            detailLabel={topAssister.name}
            detailLabelMissing={topAssister.name}
          />
        )}
      </div>

      {/* Team Performance Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(42,112,80,0.10)' }}>
            <Activity className="w-4 h-4" style={{ color: '#2A7050' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{db.teamPerformance}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Average Team Rating */}
          {(() => {
            const matchesWithRatings = mergedForStats.filter(m => m.player_ratings && m.player_ratings.length > 0);
            const last5WithRatings = matchesWithRatings.slice(0, 5);
            
            const calcAvg = (matches) => {
              if (matches.length === 0) return null;
              const matchAvgs = matches.map(m => {
                const ratings = m.player_ratings.filter(r => r.rating != null).map(r => r.rating);
                return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
              }).filter(x => x != null);
              return matchAvgs.length > 0 ? (matchAvgs.reduce((a, b) => a + b, 0) / matchAvgs.length).toFixed(1) : null;
            };
            
            const avg5 = calcAvg(last5WithRatings);
            const avgSeason = calcAvg(matchesWithRatings);
            
            return (avg5 || avgSeason) ? (
              <Card style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(139,115,85,0.16)', borderRadius: '12px', boxShadow: '0 1px 2px rgba(13,26,18,0.04)' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-4 h-4" style={{ color: '#2A7050' }} />
                    <span className="text-xs font-medium" style={{ color: '#7A6B57' }}>{db.avgRating}</span>
                  </div>
                  <div className="space-y-1.5">
                    {avg5 && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px]" style={{ color: '#9A8672' }}>{db.last5games}</span>
                        <span className="text-xl font-bold" style={{ color: '#2A7050' }}>{avg5}</span>
                      </div>
                    )}
                    {avgSeason && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px]" style={{ color: '#9A8672' }}>{db.season}</span>
                        <span className="text-lg font-semibold" style={{ color: '#5C4E38' }}>{avgSeason}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

          {/* Goals Average */}
          {(() => {
            const matchesWithGoals = withResults.filter(m => getOur(m) != null && getOpp(m) != null);
            if (matchesWithGoals.length === 0) return null;
            
            const totalScored = matchesWithGoals.reduce((sum, m) => sum + getOur(m), 0);
            const totalConceded = matchesWithGoals.reduce((sum, m) => sum + getOpp(m), 0);
            const avgScored = (totalScored / matchesWithGoals.length).toFixed(1);
            const avgConceded = (totalConceded / matchesWithGoals.length).toFixed(1);
            
            return (
              <Card style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(139,115,85,0.16)', borderRadius: '12px', boxShadow: '0 1px 2px rgba(13,26,18,0.04)' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-4 h-4" style={{ color: '#2A5FA8' }} />
                    <span className="text-xs font-medium" style={{ color: '#7A6B57' }}>{db.goalsPerGame}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px]" style={{ color: '#9A8672' }}>{db.scored}</span>
                      <span className="text-xl font-bold" style={{ color: '#2A7050' }}>{avgScored}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px]" style={{ color: '#9A8672' }}>{db.conceded}</span>
                      <span className="text-lg font-semibold" style={{ color: '#B94040' }}>{avgConceded}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Top Tactical Issues */}
          {(() => {
            const topIssues = (tacticalGoals || [])
              .filter(g => g.status === 'active')
              .sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0))
              .slice(0, 3);
            
            return topIssues.length > 0 ? (
              <button className="text-right w-full" onClick={() => setModal('issues')}>
                <Card style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(139,115,85,0.16)', borderRadius: '12px', boxShadow: '0 1px 2px rgba(13,26,18,0.04)' }} className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-4 h-4" style={{ color: '#D97706' }} />
                      <span className="text-xs font-medium" style={{ color: '#7A6B57' }}>{db.topIssues}</span>
                    </div>
                    <div className="space-y-1">
                      {topIssues.map((issue, _i) => (
                        <div key={issue.id} className="text-[10px] flex items-start gap-1" style={{ color: '#5C4E38' }}>
                          <span style={{ color: '#9A8672' }}>•</span>
                          <span className="line-clamp-1">{issue.title}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ) : null;
          })()}

          {/* Team Status Index */}
          {(() => {
            // Calculate team status based on multiple factors
            let score = 5; // Base score
            
            // Win rate impact (±2 points)
            const totalMatches = wins + draws + losses;
            if (totalMatches > 0) {
              const winRate = wins / totalMatches;
              if (winRate >= 0.6) score += 2;
              else if (winRate >= 0.4) score += 1;
              else if (winRate < 0.3) score -= 1;
            }
            
            // Goal difference impact (±1.5 points)
            const matchesWithGoals = withResults.filter(m => getOur(m) != null && getOpp(m) != null);
            if (matchesWithGoals.length > 0) {
              const totalScored = matchesWithGoals.reduce((sum, m) => sum + getOur(m), 0);
              const totalConceded = matchesWithGoals.reduce((sum, m) => sum + getOpp(m), 0);
              const goalDiff = totalScored - totalConceded;
              if (goalDiff > 5) score += 1.5;
              else if (goalDiff > 0) score += 0.5;
              else if (goalDiff < -5) score -= 1.5;
            }
            
            // Active issues impact (±1.5 points)
            const activeIssues = (tacticalGoals || []).filter(g => g.status === 'active');
            const criticalIssues = activeIssues.filter(g => g.priority === 'critical' || g.priority === 'high');
            if (criticalIssues.length === 0) score += 1.5;
            else if (criticalIssues.length <= 2) score += 0.5;
            else score -= 1;
            
            // Player availability impact (±1 point)
            const availablePlayers = (players || []).filter(p => !p.availability || p.availability === 'זמין');
            const availabilityRate = players?.length > 0 ? availablePlayers.length / players.length : 1;
            if (availabilityRate >= 0.9) score += 1;
            else if (availabilityRate < 0.7) score -= 1;
            
            // Cap score between 0-10
            score = Math.max(0, Math.min(10, score));
            
            const statusText = score >= 7.5 ? db.excellent : score >= 6.5 ? db.good : score >= 5.5 ? db.fair : score >= 4 ? db.needsImprovement : db.needsAttention;
            const statusColor = score >= 7.5 ? 'var(--brand-green-dark)' : score >= 6.5 ? 'var(--info)' : score >= 5.5 ? 'var(--warning)' : 'var(--danger)';
            
            return (
              <Card style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(139,115,85,0.16)', borderRadius: '12px', boxShadow: '0 1px 2px rgba(13,26,18,0.04)' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: statusColor }} />
                    <span className="text-xs font-medium" style={{ color: '#7A6B57' }}>{db.statusIndex}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{ color: statusColor }}>{score.toFixed(1)}</div>
                      <div className="text-[10px]" style={{ color: '#9A8672' }}>{db.outOf10}</div>
                    </div>
                    <div className="text-center text-xs font-semibold pt-1" style={{ color: statusColor }}>
                      {statusText}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      {/* Open Issues */}
      {openIssuesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(185,64,64,0.10)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#B94040' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: '#2C2416' }}>{db.openIssuesTitle}</h3>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
              style={{ backgroundColor: 'rgba(185,64,64,0.10)', color: '#B94040' }}>
              {openIssuesList.length}
            </span>
          </div>
          {openIssuesList.slice(0, 4).map((goal) => (
            <IssueCard
              key={goal.id}
              issue={goal}
              onGoToTraining={() => onGoInsight && onGoInsight('training_center')}
              onGoToAnalysis={() => onGoInsight && onGoInsight('match')}
              compact={true}
            />
          ))}
        </div>
      )}

      {/* Weekly Highlights — mentor card */}
      {highlights.length > 0 && (
        <div className="premium-card" style={{ border: '1px solid rgba(13,26,18,.08)', borderRight: '4px solid var(--brand-green-dark)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="rounded-full flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: 'var(--success-bg)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Heebo, sans-serif', fontWeight: 700 }}>{db.coachHighlights}</h3>
          </div>
          <div className="px-4 pb-3 space-y-2 pt-1">
            {highlights.slice(0, 5).map((h, i) => {
              const Icon = h.icon;
              const sem = h.color === '#2A7050' ? 'var(--success-bg)' : h.color === '#D97706' ? 'var(--warning-bg)' : 'var(--danger-bg)';
              const semFg = h.color === '#2A7050' ? 'var(--brand-green-dark)' : h.color === '#D97706' ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={i} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card-soft)' }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '24px', height: '24px', backgroundColor: sem }}>
                      <Icon className="w-3 h-3" style={{ color: semFg }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{h.text}</span>
                  </div>
                  {h.link && (
                    <button onClick={() => onGoInsight && onGoInsight(h.link)}
                      className="flex items-center gap-0.5 text-xs font-semibold flex-shrink-0"
                      style={{ color: 'var(--brand-green-dark)' }}>
                      {db.details} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <IssuesModal
        open={modal === 'issues'}
        onClose={() => setModal(null)}
        issues={(tacticalGoals || []).filter(g => g.status === 'active').sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority] || 2) - (order[b.priority] || 2);
        })}
        onGoInsight={onGoInsight}
        professionalSummaries={professionalSummaries}
      />
      <TopScorersModal
        open={modal === 'scorers'}
        onClose={() => setModal(null)}
        players={players}
        type="goals"
      />
      <TopScorersModal
        open={modal === 'assisters'}
        onClose={() => setModal(null)}
        players={players}
        type="assists"
      />

      {/* Game Style Alerts — mentor card */}
      {(gameStyleIsStale || recurringGameStyleIssues.length > 0) && (
        <div className="premium-card" style={{ border: '1px solid rgba(13,26,18,.08)', borderRight: '4px solid var(--brand-green-dark)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="rounded-full flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: 'var(--success-bg)' }}>
              <Settings className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Heebo, sans-serif', fontWeight: 700 }}>על בסיס שיטת המשחק שהגדרת</h3>
          </div>
          <div className="px-4 pb-3 space-y-2 pt-1">
            {gameStyleIsStale && (
              <div className="flex items-start gap-2 py-2 px-3 rounded-lg"
                style={{ backgroundColor: 'var(--warning-bg)' }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    האם שיטת המשחק שהגדרת עדיין רלוונטית? לא עודכנה מעל חודש — בדוק ועדכן לפני המשחק הבא.
                  </p>
                </div>
                <button onClick={() => onGoInsight && onGoInsight('team')}
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: 'var(--brand-green-dark)' }}>
                  עדכן <ChevronRight className="w-3 h-3 inline" />
                </button>
              </div>
            )}
            {recurringGameStyleIssues.slice(0, 3).map(issue => (
              <div key={issue.id} className="flex items-center gap-2 py-2 px-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-card-soft)' }}>
                <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{ width: '28px', height: '28px', backgroundColor: 'var(--brand-green-dark)', fontSize: '11px' }}>
                  ×{issue.occurrence_count}
                </div>
                <p className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-semibold">דפוס חוזר — </span>
                  "{issue.title}" זוהה {issue.occurrence_count}× בסיכומים. שקול לעבוד על זה באימון.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Squad Status — with overlapping avatars */}
      {players && players.length > 0 && (() => {
        const available = players.filter(p => !p.availability || p.availability === 'זמין');
        const avatarPlayers = available.slice(0, 8);
        const remaining = available.length - avatarPlayers.length;
        return (
          <div className="premium-card px-4 py-3" style={{ border: '1px solid rgba(13,26,18,.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{db.squadStatus}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Overlapping avatars */}
              <div className="flex items-center">
                {avatarPlayers.map((p, i) => (
                  <div key={p.id} className="rounded-full flex items-center justify-center font-semibold text-white border-2"
                    style={{ width: '32px', height: '32px', marginLeft: i > 0 ? '-8px' : '0', backgroundColor: 'var(--brand-green-dark)', borderColor: 'var(--bg-card)', fontSize: '11px', zIndex: avatarPlayers.length - i }}
                    title={p.name}>
                    {p.name?.charAt(0) || '?'}
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="rounded-full flex items-center justify-center font-semibold border-2"
                    style={{ width: '32px', height: '32px', marginLeft: '-8px', backgroundColor: 'var(--bg-card-soft)', borderColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    +{remaining}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  <strong>{available.length}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> {db.available}</span>
                </span>
              </div>
              {unavailablePlayers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    <strong>{unavailablePlayers.length}</strong>
                     <span style={{ color: 'var(--text-muted)' }}> {db.unavailable}: </span>
                    <span style={{ color: 'var(--danger)' }}>{unavailablePlayers.slice(0, 3).map(p => p.name).join(', ')}</span>
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => onGoInsight && onGoInsight('team')}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ color: 'var(--brand-green-dark)', border: '1px solid rgba(22,163,74,.25)', backgroundColor: 'var(--success-bg)', minHeight: '36px' }}>
              <Users className="w-3.5 h-3.5" /> {db.manageSquad}
            </button>
          </div>
        );
      })()}
    </div>
  );
}