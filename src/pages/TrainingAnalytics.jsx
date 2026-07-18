import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44, setActiveAITeam } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { useLang } from '@/lib/LanguageContext';
import { listFingerprint } from '@/lib/analysisFingerprint';
import BottomLine from '@/components/ui/BottomLine';
import DashboardTopBar from '../components/dashboard/DashboardTopBar';
import {
  Users, User, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle
} from 'lucide-react';

// Design tokens for the "Premium Match-Day" training-analytics look (hifi handoff).
const TA_STYLES = `
  @keyframes taFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes taPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
  .ta-fade { animation: taFadeUp .4s ease-out both; }
  .ta-glow { animation: taPulse 4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .ta-fade, .ta-glow { animation: none !important; transform: none !important; }
  }
`;

// period_comparison status enum → arrow / colours / team-level status label.
const STY = {
  up:   { color: '#16A34A', bg: '#E7F6EC', border: 'rgba(22,163,74,.2)',  arrow: '↑', statusLabel: 'משתפר' },
  flat: { color: '#D97706', bg: '#FDF3E3', border: 'rgba(217,119,6,.2)',  arrow: '→', statusLabel: 'ללא שינוי' },
  down: { color: '#DC2626', bg: '#FCEBEB', border: 'rgba(220,38,38,.2)',  arrow: '↓', statusLabel: 'צריך עבודה' },
};
const statusKey = (s) => (s === 'שיפור' ? 'up' : s === 'דעיכה' ? 'down' : 'flat');

// Personal topic/trend helpers return a legacy hex colour — map it to the new palette.
const visualFromColor = (c) => {
  if (c === '#2A7050' || c === '#16A34A') return { arrow: '↑', ...STY.up };
  if (c === '#B94040' || c === '#DC2626') return { arrow: '↓', ...STY.down };
  if (c === '#D97706') return { arrow: '→', ...STY.flat };
  return { arrow: '•', color: '#94A39A', bg: '#F1EEE8', border: 'rgba(148,163,154,.2)', statusLabel: '' };
};
const ratingColor = (r) => (r >= 7 ? '#16A34A' : r >= 5 ? '#D97706' : '#DC2626');

export default function TrainingAnalytics() {
  const { selectedTeamId, selectTeam } = useTeam();
  const { t, dir } = useLang();
  const isHe = t.lang === 'he';
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  // Accordion state — one open per group (handoff §Interactions)
  const [openTopic, setOpenTopic] = useState(null);
  const [openSection, setOpenSection] = useState('improve');
  const [openPlayer, setOpenPlayer] = useState(null);

  // Team analysis states
  const [timeRange, setTimeRange] = useState('7');
  const [summaries, setSummaries] = useState([]);
  const [teamAnalysis, setTeamAnalysis] = useState(null);
  const [analyzingTeam, setAnalyzingTeam] = useState(false);
  
  // Personal analysis states
  const [players, setPlayers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [trainingEvaluations, setTrainingEvaluations] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    (async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const teamsData = await base44.entities.Team.list();
      setTeams(teamsData);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedTeamId) loadData();
  }, [selectedTeamId, timeRange]);

  // Period-analysis prompts carry the team's format/age context.
  useEffect(() => {
    setActiveAITeam(teams.find(t => t.id === selectedTeamId) || null);
  }, [teams, selectedTeamId]);

  const loadData = async () => {
    const [summariesData, playersData, programsData, evalsData] = await Promise.all([
      base44.entities.ProfessionalSummary.filter({ 
        team_id: selectedTeamId, 
        event_type: 'training' 
      }, '-event_date', 200),
      base44.entities.Player.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingProgram.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingSessionEvaluation.filter({ team_id: selectedTeamId }, '-training_date', 200),
    ]);
    setSummaries(summariesData);
    setPlayers(playersData);
    setPrograms(programsData);
    setTrainingEvaluations(evalsData);
  };

  // Identity of the training data feeding the team analysis. When it changes the
  // analysis regenerates itself; while it holds, the cache is reused. No button.
  const trainingFingerprint = useMemo(
    () => `${timeRange}:${listFingerprint(summaries, s => ({
      d: s.event_date, t: s.tactical_topics, w: s.what_worked, i: s.issues_found,
      ins: s.tactical_insights, sat: s.satisfaction,
    }))}`,
    [timeRange, summaries],
  );

  const analyzeRef = useRef(null);

  useEffect(() => {
    if (!selectedTeamId || summaries.length === 0) { setTeamAnalysis(null); return; }
    let cancelled = false;
    (async () => {
      let cache = null;
      try {
        const teams = await base44.entities.Team.filter({ id: selectedTeamId });
        cache = teams[0]?.training_analysis_cache || null;
      } catch { /* regenerate */ }
      if (cancelled) return;
      if (cache?.data && cache.fingerprint === trainingFingerprint) {
        setTeamAnalysis(cache.data);
      } else {
        analyzeRef.current?.();
      }
    })();
    return () => { cancelled = true; };
  }, [trainingFingerprint, selectedTeamId, summaries.length]);

  const analyzeTeamTrainings = async () => {
    setAnalyzingTeam(true);
    try {
      const days = parseInt(timeRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const filtered = summaries.filter(s => new Date(s.event_date) >= cutoff);
      
      // Previous period for comparison
      const prevCutoff = new Date(cutoff);
      prevCutoff.setDate(prevCutoff.getDate() - days);
      const prevFiltered = summaries.filter(s => {
        const d = new Date(s.event_date);
        return d >= prevCutoff && d < cutoff;
      });

      const replyLang = isHe ? 'Hebrew' : 'English';
      const prompt = `You are a professional football training analyst. Analyze the team's training sessions for the recent period. Reply in ${replyLang}.

### Current Period Trainings (last ${days} days):
${JSON.stringify(filtered.map(s => ({
  date: s.event_date,
  topics: s.tactical_topics,
  what_worked: s.what_worked,
  issues: s.issues_found,
  insights: s.tactical_insights,
  satisfaction: s.satisfaction
})), null, 2)}

### Previous Period Trainings (${days} days before that):
${JSON.stringify(prevFiltered.map(s => ({
  date: s.event_date,
  topics: s.tactical_topics,
  what_worked: s.what_worked,
  issues: s.issues_found
})), null, 2)}

Create a professional analysis including:
1. Period summary - number of trainings, main topics, goals
2. Positive points - what worked well in training
3. Improvement points - recurring issues or topics that didn't improve
4. Topics for next trainings - work topics only, no specific drills
5. Comparison to previous period - for each tactical topic, identify: improvement/maintained/declining + explanation why. Also add, per topic: "worked" (one short sentence on what worked in this topic) and "next_step" (one short sentence on the next step to push it forward).

The "status" field in period_comparison must be one of: "שיפור", "שימור", "דעיכה" (these are internal enum values, keep them in Hebrew regardless of reply language).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            period_summary: {
              type: 'object',
              properties: {
                total_trainings: { type: 'number' },
                main_topics: { type: 'array', items: { type: 'string' } },
                training_goals: { type: 'string' },
                general_trends: { type: 'string' }
              }
            },
            positive_points: { type: 'array', items: { type: 'string' } },
            improvement_points: { type: 'array', items: { type: 'string' } },
            next_training_topics: { type: 'array', items: { type: 'string' } },
            period_comparison: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  status: { type: 'string', enum: ['שיפור', 'שימור', 'דעיכה'] },
                  explanation: { type: 'string' },
                  worked: { type: 'string' },
                  next_step: { type: 'string' }
                }
              }
            },
            professional_summary: { type: 'string' }
          }
        }
      });

      if (result?.__ai_error) {
        console.warn('Training analysis unavailable:', result.__ai_error);
      } else {
        setTeamAnalysis(result);
        try {
          await base44.entities.Team.update(selectedTeamId, {
            training_analysis_cache: { data: result, timeRange, fingerprint: trainingFingerprint, updated_at: new Date().toISOString() }
          });
        } catch (e) { console.warn('Failed to cache training analysis:', e); }
      }
    } catch (error) {
      console.error('Error analyzing team trainings:', error);
    }
    setAnalyzingTeam(false);
  };
  analyzeRef.current = analyzeTeamTrainings;

  // Dev trend from evaluations
  const calcDevTrend = (evals) => {
    if (!evals || evals.length === 0) return { label: 'לא נבדק עדיין', icon: AlertTriangle, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
    if (evals.length < 2) return { label: 'מעט נתונים', icon: Minus, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
    const recent = evals.slice(0, 2).map(e => e.rating);
    const older = evals.slice(2, 4).map(e => e.rating);
    const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
    const avgO = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgR;
    if (avgR > avgO + 0.5) return { label: '↑ שיפור יציב', icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)' };
    if (avgR < avgO - 0.5) return { label: '⚠ דורש עבודה', icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)' };
    return { label: '→ עדיין לא עקבי', icon: Minus, color: '#D97706', bg: 'rgba(217,119,6,0.08)' };
  };

  const topicStatus = (topic, playerEvals) => {
    const relevant = playerEvals.filter(e => e.topic_scores?.[topic] != null);
    if (relevant.length === 0) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
    const scores = relevant.slice(0, 3).map(e => e.topic_scores[topic]);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const isRecent = (Date.now() - new Date(relevant[0].training_date).getTime()) < 21 * 86400000;
    if (!isRecent) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
    if (scores.length >= 2 && scores[0] > scores[scores.length - 1] + 0.5) return { label: 'שיפור עקבי', icon: TrendingUp, color: '#2A7050' };
    if (avg < 5) return { label: 'דורש עבודה', icon: TrendingDown, color: '#B94040' };
    if (avg >= 7) return { label: 'שיפור באימונים', icon: TrendingUp, color: '#2A7050' };
    return { label: 'בעבודה', icon: Minus, color: '#D97706' };
  };

  const playersWithPrograms = players
    .map(p => ({ ...p, activePrograms: programs.filter(pr => pr.player_id === p.id && pr.status === 'active') }))
    .filter(p => p.activePrograms.length > 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A7050' }} />
    </div>
  );

  // ── Derived team data (from the existing teamAnalysis LLM result) ─────────────
  const days = parseInt(timeRange);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  // How many sessions in the period touched a given tactical topic.
  const topicSessions = (topic) => {
    if (!topic) return 0;
    const needle = String(topic).trim();
    return summaries.filter(s => {
      if (new Date(s.event_date) < cutoff) return false;
      return (s.tactical_topics || []).some(tt => {
        const a = String(tt); return a.includes(needle) || needle.includes(a);
      });
    }).length;
  };

  const comparison = teamAnalysis?.period_comparison || [];
  const ups = comparison.filter(c => statusKey(c.status) === 'up').length;
  const downs = comparison.filter(c => statusKey(c.status) === 'down').length;
  const rangeLabel = { '7': '7 הימים האחרונים', '30': '30 הימים האחרונים', '90': '3 החודשים האחרונים' }[timeRange];
  const heroTitle = activeTab === 'personal'
    ? 'ניתוח אישי — שחקנים במעקב'
    : ups > downs ? 'הקבוצה במגמת עלייה'
    : downs > ups ? 'הקבוצה זקוקה לתשומת לב'
    : 'ניתוח מגמות הקבוצה';

  const heroGradient = 'linear-gradient(135deg,#0D1A12 0%,#13241A 60%,#0F2A18 100%)';
  const pillOn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9999, background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.45)', color: '#4ADE80', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' };
  const pillOff = { ...pillOn, background: 'transparent', border: '1px solid rgba(244,239,230,.2)', color: 'rgba(244,239,230,.6)', fontWeight: 700 };
  const rOn = { padding: '5px 14px', borderRadius: 9999, background: '#4ADE80', color: '#0D1A12', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit' };
  const rOff = { ...rOn, background: 'transparent', color: 'rgba(244,239,230,.6)', fontWeight: 700 };
  const kpiCard = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(74,222,128,.18)', borderRadius: 14, padding: '14px 16px' };
  const kpiNum = { fontSize: 26, fontWeight: 900, fontFamily: "'Heebo',sans-serif" };
  const kpiLabel = { fontSize: 12, color: 'rgba(244,239,230,.6)' };
  const whiteCard = { background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 1px 2px rgba(13,26,18,.05),0 4px 12px rgba(13,26,18,.06)', marginTop: 16 };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EFE6' }} dir={dir}>
      <style>{TA_STYLES}</style>
      <DashboardTopBar
        user={user}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={selectTeam}
        teamId={selectedTeamId}
      />


      <div style={{ paddingTop: 56, paddingBottom: 48 }}>
        {/* ── Dark hero band ─────────────────────────────────────────── */}
        <div style={{ background: heroGradient, padding: '24px 20px 84px', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden className="ta-glow" style={{ position: 'absolute', top: -60, insetInlineStart: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,222,128,.2),transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1024, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#4ADE80' }}>ניתוח אימונים · {rangeLabel}</div>
                <h1 style={{ margin: '6px 0 0', fontFamily: "'Heebo',sans-serif", fontWeight: 900, fontSize: 26, color: '#F4EFE6' }}>{heroTitle}</h1>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(244,239,230,.6)' }}>
                  {analyzingTeam ? 'מנתח אימונים...' : 'מתעדכן אוטומטית עם כל אימון חדש ✦'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('team')} style={activeTab === 'team' ? pillOn : pillOff}>
                  <Users className="w-4 h-4" /> קבוצתי
                </button>
                <button onClick={() => setActiveTab('personal')} style={activeTab === 'personal' ? pillOn : pillOff}>
                  <User className="w-4 h-4" /> אישי
                </button>
              </div>
            </div>

            {activeTab === 'team' && (
              <>
                {/* Time range pills */}
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 9999, padding: 4, marginTop: 16, gap: 2 }}>
                  <button onClick={() => setTimeRange('7')} style={timeRange === '7' ? rOn : rOff}>7 ימים</button>
                  <button onClick={() => setTimeRange('30')} style={timeRange === '30' ? rOn : rOff}>30 ימים</button>
                  <button onClick={() => setTimeRange('90')} style={timeRange === '90' ? rOn : rOff}>3 חודשים</button>
                </div>

                {/* KPI strip */}
                {teamAnalysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginTop: 16 }}>
                    <div className="ta-fade" style={kpiCard}>
                      <div style={{ ...kpiNum, color: '#4ADE80' }}>{teamAnalysis.period_summary?.total_trainings ?? 0}</div>
                      <div style={kpiLabel}>אימונים בוצעו</div>
                    </div>
                    <div className="ta-fade" style={{ ...kpiCard, animationDelay: '.05s' }}>
                      <div style={{ ...kpiNum, color: '#F4EFE6' }}>{teamAnalysis.period_summary?.main_topics?.length ?? comparison.length}</div>
                      <div style={kpiLabel}>נושאים בעבודה</div>
                    </div>
                    <div className="ta-fade" style={{ ...kpiCard, animationDelay: '.1s' }}>
                      <div style={{ ...kpiNum, color: '#4ADE80' }}>{ups} <span style={{ fontSize: 14 }}>▲</span></div>
                      <div style={kpiLabel}>נושאים משתפרים</div>
                    </div>
                    <div className="ta-fade" style={{ ...kpiCard, animationDelay: '.15s' }}>
                      <div style={{ ...kpiNum, color: downs > 0 ? '#FBBF24' : '#F4EFE6' }}>{downs} <span style={{ fontSize: 14 }}>▼</span></div>
                      <div style={kpiLabel}>נושא צריך עבודה</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginTop: 16 }}>
                <div style={kpiCard}>
                  <div style={{ ...kpiNum, color: '#4ADE80' }}>{playersWithPrograms.length}</div>
                  <div style={kpiLabel}>שחקנים עם תוכנית פעילה</div>
                </div>
                <div style={kpiCard}>
                  <div style={{ ...kpiNum, color: '#4ADE80' }}>
                    {playersWithPrograms.filter(p => calcDevTrend(trainingEvaluations.filter(e => e.player_id === p.id).sort((a, b) => new Date(b.training_date) - new Date(a.training_date))).color === '#2A7050').length} <span style={{ fontSize: 14 }}>▲</span>
                  </div>
                  <div style={kpiLabel}>במגמת שיפור</div>
                </div>
                <div style={kpiCard}>
                  <div style={{ ...kpiNum, color: '#F4EFE6' }}>{trainingEvaluations.filter(e => new Date(e.training_date) >= cutoff).length}</div>
                  <div style={kpiLabel}>הערכות בתקופה</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 16px' }}>
          {activeTab === 'team' && (
            <>
              {analyzingTeam && !teamAnalysis && (
                <div style={{ ...whiteCard, marginTop: -56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 }}>
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#16A34A' }} />
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>מנתח אימונים קבוצתיים...</span>
                </div>
              )}

              {!analyzingTeam && !teamAnalysis && (
                <div style={{ ...whiteCard, marginTop: -56, textAlign: 'center', padding: 40 }}>
                  <TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
                  <p style={{ margin: 0, fontSize: 14, color: '#94A39A' }}>עדיין אין מספיק אימונים בתקופה זו לניתוח.</p>
                </div>
              )}

              {teamAnalysis && (
                <>
                  {/* Bottom line — overlapping dark card */}
                  <div style={{ marginTop: -56, position: 'relative' }}>
                    <BottomLine
                      variant="dark"
                      dataForAI={{
                        period_days: timeRange,
                        total_trainings: teamAnalysis.period_summary?.total_trainings,
                        main_topics: teamAnalysis.period_summary?.main_topics,
                        positive_points: teamAnalysis.positive_points,
                        improvement_points: teamAnalysis.improvement_points,
                        period_comparison: teamAnalysis.period_comparison,
                        professional_summary: teamAnalysis.professional_summary,
                      }}
                      context="ניתוח אימונים קבוצתי"
                      cacheKey={`training-analysis-${selectedTeamId}-${timeRange}-${summaries.length}`}
                    />
                  </div>

                  {/* What we worked on — the central card */}
                  {comparison.length > 0 && (
                    <div style={whiteCard}>
                      <div style={{ fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 17, color: '#14231A' }}>מה עבדנו עליו — ואיך זה מתקדם</div>
                      <div style={{ fontSize: 12, color: '#94A39A', marginBottom: 16 }}>לעומת התקופה הקודמת</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {comparison.map((c, i) => {
                          const st = STY[statusKey(c.status)];
                          const id = `t${i}`;
                          const open = openTopic === id;
                          const sessions = topicSessions(c.topic);
                          return (
                            <div key={id} style={{ borderRadius: 12, background: st.bg, border: `1px solid ${st.border}` }}>
                              <button onClick={() => setOpenTopic(open ? null : id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 9999, background: st.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{st.arrow}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: '#14231A' }}>{c.topic}</div>
                                  <div style={{ fontSize: 13, color: '#5C6B61', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>{c.explanation}</div>
                                </div>
                                <span style={{ padding: '5px 14px', borderRadius: 9999, background: st.color, color: '#fff', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{st.statusLabel}</span>
                              </button>
                              {open && (
                                <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ padding: '4px 12px', borderRadius: 9999, background: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, color: '#14231A' }}>🏋️ {sessions} אימונים בתקופה</span>
                                    <span style={{ padding: '4px 12px', borderRadius: 9999, background: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, color: st.color }}>{st.arrow} {st.statusLabel}</span>
                                  </div>
                                  {c.worked && (
                                    <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 10, padding: '12px 14px' }}>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', marginBottom: 2 }}>✔ מה עבד</div>
                                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#14231A' }}>{c.worked}</p>
                                    </div>
                                  )}
                                  {c.next_step && (
                                    <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 10, padding: '12px 14px' }}>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', marginBottom: 2 }}>➜ מה הלאה</div>
                                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#14231A' }}>{c.next_step}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Insight accordions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                    {[
                      { id: 'pos', icon: '✔', accent: '#16A34A', head: '#E7F6EC', title: `${(teamAnalysis.positive_points || []).length} נקודות חיוביות`, preview: 'דברים שעבדו טוב באימונים', items: (teamAnalysis.positive_points || []).map(text => ({ text })) },
                      { id: 'improve', icon: '⚠', accent: '#DC2626', head: '#FCEBEB', title: `${(teamAnalysis.improvement_points || []).length} נקודות לשיפור`, preview: 'בעיות שחזרו או נושאים שלא השתפרו', items: (teamAnalysis.improvement_points || []).map(text => ({ text })) },
                      { id: 'next', icon: '🎯', accent: '#2563EB', head: '#EAF1FD', title: `${(teamAnalysis.next_training_topics || []).length} נושאים לאימונים הבאים`, preview: 'נושאי עבודה לתקופה הקרובה', items: (teamAnalysis.next_training_topics || []).map(text => ({ text })) },
                    ].filter(sec => sec.items.length > 0).map(sec => {
                      const open = openSection === sec.id;
                      return (
                        <div key={sec.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 2px rgba(13,26,18,.05),0 4px 12px rgba(13,26,18,.06)', overflow: 'hidden' }}>
                          <button onClick={() => setOpenSection(open ? null : sec.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: `linear-gradient(90deg,${sec.head},#ffffff 70%)`, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: sec.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0, boxShadow: `0 4px 10px ${sec.accent}55` }}>{sec.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 15, color: '#14231A', fontFamily: "'Heebo',sans-serif" }}>{sec.title}</div>
                              <div style={{ fontSize: 12, color: '#5C6B61' }}>{sec.preview}</div>
                            </div>
                            <span style={{ width: 26, height: 26, borderRadius: 9999, background: 'rgba(13,26,18,.05)', color: '#5C6B61', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{open ? '⌃' : '⌄'}</span>
                          </button>
                          {open && (
                            <div style={{ padding: '2px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {sec.items.map((it, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FBFAF6', border: '1px solid rgba(13,26,18,.05)', borderRadius: 12, padding: '12px 14px' }}>
                                  <span style={{ width: 26, height: 26, borderRadius: 9999, background: sec.head, color: sec.accent, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#14231A' }}>{it.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Professional summary */}
                  {teamAnalysis.professional_summary && (
                    <div style={{ ...whiteCard, padding: '20px 22px' }}>
                      <div style={{ fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 15, color: '#14231A', marginBottom: 8 }}>📋 סיכום מקצועי</div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#5C6B61' }}>{teamAnalysis.professional_summary}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'personal' && (
            <div style={{ marginTop: -56, position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {playersWithPrograms.length === 0 ? (
                <div style={{ ...whiteCard, marginTop: 0, textAlign: 'center', padding: 40 }}>
                  <User className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
                  <p style={{ margin: 0, fontSize: 14, color: '#94A39A' }}>אין תוכניות אישיות פעילות</p>
                </div>
              ) : playersWithPrograms.map(player => {
                const open = openPlayer === player.id;
                const workTopics = [...new Set(player.activePrograms.flatMap(p => p.work_topics || []))];
                const playerEvals = trainingEvaluations
                  .filter(e => e.player_id === player.id)
                  .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
                const trend = calcDevTrend(playerEvals);
                const tv = visualFromColor(trend.color);
                return (
                  <div key={player.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 2px rgba(13,26,18,.05),0 4px 12px rgba(13,26,18,.06)', border: `1px solid ${open ? 'rgba(22,163,74,.35)' : 'rgba(13,26,18,.06)'}` }}>
                    <button onClick={() => setOpenPlayer(open ? null : player.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
                      {player.photo_url ? (
                        <div style={{ width: 44, height: 44, borderRadius: 9999, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(22,163,74,.25)' }}>
                          <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17, fontWeight: 800, background: 'rgba(22,163,74,.12)', color: '#16A34A', border: '2px solid rgba(22,163,74,.25)' }}>{(player.name || '?').charAt(0)}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#14231A' }}>{player.name}</div>
                        <div style={{ fontSize: 12, color: '#94A39A' }}>{player.position} · {workTopics.length} נושאים במעקב</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999, background: tv.bg, color: tv.color, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{trend.label}</span>
                    </button>
                    {open && (
                      <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(13,26,18,.06)' }}>
                        {workTopics.length > 0 && (
                          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#14231A' }}>מה הוא עובד עליו — ואיך הולך</div>
                            {workTopics.map((topic, i) => {
                              const ts = topicStatus(topic, playerEvals);
                              const v = visualFromColor(ts.color);
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: v.bg, border: `1px solid ${v.border}` }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 9999, background: v.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{v.arrow}</div>
                                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#14231A' }}>{topic}</span>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: v.color, whiteSpace: 'nowrap' }}>{ts.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {playerEvals.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#14231A' }}>הערכות אחרונות</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
                              {playerEvals.slice(0, 3).map((ev, i) => (
                                <div key={i} style={{ background: '#FBFAF6', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(13,26,18,.06)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5C6B61' }}>{new Date(ev.training_date).toLocaleDateString('he-IL')}</span>
                                    <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "'Heebo',sans-serif", color: ratingColor(ev.rating) }}>{ev.rating}<span style={{ fontSize: 11, fontWeight: 600, color: '#94A39A' }}>/10</span></span>
                                  </div>
                                  {ev.coach_note && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#5C6B61', fontStyle: 'italic' }}>"{ev.coach_note}"</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
