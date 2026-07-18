import React, { useState, useEffect } from 'react';
import { base44, setActiveAITeam } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { Loader2, Target, Dumbbell, Users } from 'lucide-react';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import WorkTopicsList from '@/components/training/WorkTopicsList';
import WorkTopicModal from '@/components/training/WorkTopicModal';
import TrainingSessionsList from '@/components/training/TrainingSessionsList';
import PlayerDevelopmentList from '@/components/training/PlayerDevelopmentList';
import MatchSummariesTab from '@/components/training/MatchSummariesTab';
import ProgramTrendsWidget from '@/components/training/ProgramTrendsWidget';
import { Swords, ShieldCheck } from 'lucide-react';
import GamePrepTab from '@/components/gameprep/GamePrepTab';
import { useLang } from '@/lib/LanguageContext';
import { useGameStyle, getTrainingRecommendationsFromGameStyle } from '@/hooks/useGameStyle';

export default function TrainingCenter() {
  const { t: langT, dir } = useLang();
  const isHe = langT.lang === 'he';
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [topics, setTopics] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [players, setPlayers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [trainingEvaluations, setTrainingEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topics');
  const [editTopic, setEditTopic] = useState(null);
  const { selectedTeamId, selectTeam } = useTeam();
  const { gameStyle } = useGameStyle(selectedTeamId);
  const gameStyleRecs = getTrainingRecommendationsFromGameStyle(gameStyle);

  const TABS = [
    { id: 'topics',   label: isHe ? 'נושאי עבודה' : 'Work Topics',          icon: Target },
    { id: 'sessions', label: isHe ? 'אימונים קבוצתיים' : 'Team Sessions',   icon: Dumbbell },
    { id: 'matches',  label: isHe ? 'סיכומי משחקים' : 'Match Summaries',    icon: Swords },
    { id: 'players',  label: isHe ? 'תוכניות שחקנים' : 'Player Programs',   icon: Users },
    { id: 'gameprep', label: isHe ? 'הכנה למשחק' : 'Game Prep',             icon: ShieldCheck },
  ];

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
  }, [selectedTeamId]);

  // AI prompts fired from this page carry the team's format/age context.
  useEffect(() => {
    setActiveAITeam(teams.find(t => t.id === selectedTeamId) || null);
  }, [teams, selectedTeamId]);

  const loadData = async () => {
    const [topicsData, summariesData, playersData, programsData, analysesData, evalsData] = await Promise.all([
      base44.entities.TacticalGoal.filter({ team_id: selectedTeamId }, '-created_date', 100),
      base44.entities.ProfessionalSummary.filter({ team_id: selectedTeamId }, '-event_date', 60),
      base44.entities.Player.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingProgram.filter({ team_id: selectedTeamId }),
      base44.entities.MatchAnalysis.filter({ team_id: selectedTeamId }, '-date', 50),
      base44.entities.TrainingSessionEvaluation.filter({ team_id: selectedTeamId }, '-training_date', 200),
    ]);
    setTopics(topicsData);
    setSummaries(summariesData);
    setPlayers(playersData);
    setPrograms(programsData);
    setAnalyses(analysesData);
    setTrainingEvaluations(evalsData);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A7050' }} />
    </div>
  );

  const trainingSummaries = summaries.filter(s => s.event_type === 'training');
  const matchSummaries = summaries.filter(s => s.event_type === 'match');
  const activeTopics = topics.filter(tp => tp.status === 'active');
  const activePrograms = programs.filter(p => p.status === 'active');

  // ── Real hero stats ──
  const criticalCount = activeTopics.filter(tp => tp.priority === 'critical').length;

  const now = new Date();
  const inMonth = (dateStr, offset) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  };
  const trainingsThisMonth = trainingSummaries.filter(s => inMonth(s.event_date, 0)).length;
  const trainingsLastMonth = trainingSummaries.filter(s => inMonth(s.event_date, 1)).length;
  const monthDelta = trainingsThisMonth - trainingsLastMonth;

  let wins = 0, draws = 0, losses = 0;
  matchSummaries.forEach(s => {
    if (s.result_our == null || s.result_opponent == null) return;
    if (s.result_our > s.result_opponent) wins++;
    else if (s.result_our === s.result_opponent) draws++;
    else losses++;
  });

  // Players (with an active program) whose most-recent evaluation is weak (<6).
  const latestRatingByPlayer = {};
  [...trainingEvaluations]
    .sort((a, b) => new Date(a.training_date) - new Date(b.training_date))
    .forEach(ev => { latestRatingByPlayer[ev.player_id] = ev.rating; });
  const attentionCount = [...new Set(activePrograms.map(p => p.player_id))]
    .filter(pid => latestRatingByPlayer[pid] != null && latestRatingByPlayer[pid] < 6).length;

  const heroStats = [
    { label: isHe ? 'נושאים פעילים' : 'Active topics', value: activeTopics.length,
      delta: criticalCount > 0 ? `${criticalCount} ${isHe ? 'קריטי' : 'critical'}` : null, deltaColor: '#DC2626' },
    { label: isHe ? 'אימונים החודש' : 'Sessions this month', value: trainingsThisMonth,
      delta: monthDelta !== 0 ? `${monthDelta > 0 ? '↑' : '↓'} ${Math.abs(monthDelta)} ${isHe ? 'מהחודש שעבר' : 'vs last month'}` : null,
      deltaColor: monthDelta >= 0 ? '#16A34A' : '#DC2626' },
    { label: isHe ? 'מאזן משחקים' : 'Match record', value: `${wins}-${draws}-${losses}`,
      delta: isHe ? 'נצ-ת-ה' : 'W-D-L', deltaColor: '#94A39A' },
    { label: isHe ? 'תוכניות שחקנים' : 'Player programs', value: activePrograms.length,
      delta: attentionCount > 0 ? `${attentionCount} ${isHe ? 'דורשים תשומת לב' : 'need attention'}` : null, deltaColor: '#D97706' },
  ];

  const tabCounts = {
    topics: activeTopics.length,
    sessions: trainingSummaries.length,
    matches: matchSummaries.length,
    players: activePrograms.length,
    gameprep: 0,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EFE6' }} dir={dir}>
      <DashboardTopBar
        user={user}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={selectTeam}
        teamId={selectedTeamId}
      />
      <div className="pt-14 pb-10 max-w-5xl mx-auto px-4 md:px-6">
        {/* ── Hero ── */}
        <div style={{
          marginTop: 20, position: 'relative', overflow: 'visible',
          background: 'linear-gradient(150deg,#0D1A12 0%,#13241A 55%,#16301F 100%)',
          borderRadius: 24, padding: '24px 24px 0',
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, borderRadius: 24, opacity: 0.06,
            background: 'repeating-linear-gradient(90deg, transparent 0 119px, #4ADE80 119px 120px)',
          }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: 'rgba(74,222,128,.14)', border: '1px solid rgba(74,222,128,.3)',
              boxShadow: '0 0 24px rgba(74,222,128,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Target className="w-6 h-6" style={{ color: '#4ADE80' }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: '#F4EFE6', fontWeight: 800, fontSize: 22, letterSpacing: '-.3px', fontFamily: "'Heebo',sans-serif" }}>
                {isHe ? 'מרכז אימונים' : 'Training Center'}
              </div>
              <div style={{ color: 'rgba(244,239,230,.55)', fontSize: 12, marginTop: 2 }}>
                {trainingsThisMonth} {isHe ? 'אימונים החודש' : 'sessions this month'} · {matchSummaries.length} {isHe ? 'סיכומי משחקים' : 'match summaries'} · {activeTopics.length} {isHe ? 'נושאים פעילים' : 'active topics'}
              </div>
            </div>
          </div>
          {/* Stat strip overlapping the hero bottom */}
          <div style={{
            position: 'relative', marginTop: 20, transform: 'translateY(28px)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12,
          }}>
            {heroStats.map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: '14px 16px', boxShadow: '0 4px 12px rgba(13,26,18,.08)' }}>
                <div style={{ fontSize: 11, color: '#5C6B61', fontWeight: 600 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#14231A', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                  {s.delta && <span style={{ fontSize: 11, fontWeight: 700, color: s.deltaColor }}>{s.delta}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 56 }} />
        </div>

        {/* ── Tab Bar ── */}
        <div className="tc-hide-scroll" style={{
          marginTop: 20, display: 'flex', gap: 6, background: '#FFFFFF', borderRadius: 14, padding: 6,
          boxShadow: 'var(--shadow-card)', overflowX: 'auto',
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            const count = tabCounts[t.id];
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: active ? 700 : 600,
                  background: active ? '#0D1A12' : 'transparent',
                  color: active ? '#4ADE80' : '#5C6B61',
                  boxShadow: active ? '0 1px 3px rgba(13,26,18,.15)' : 'none',
                  transition: 'all .2s ease-out', minHeight: 44,
                }}>
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {count > 0 && (
                  <span style={{
                    background: active ? 'rgba(74,222,128,.2)' : 'rgba(13,26,18,.06)',
                    borderRadius: 99, padding: '0 6px', fontSize: 10,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ height: 16 }} />

        {/* Tab Content */}
        {activeTab === 'topics' && (
          <>
            {gameStyleRecs.length > 0 && (
              <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: 'rgba(42,112,80,0.07)', border: '1px solid rgba(42,112,80,0.22)' }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#2A7050' }}>
                  <Target className="w-3.5 h-3.5" />
                  המלצות אימון על בסיס שיטת המשחק שהגדרת
                </p>
                <div className="space-y-1">
                  {gameStyleRecs.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#5C4E38' }}>
                      <span style={{ color: '#2A7050' }}>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <WorkTopicsList
              topics={topics}
              summaries={summaries}
              onAddTopic={() => setEditTopic({})}
              onEditTopic={(t) => setEditTopic(t)}
              onRefresh={loadData}
              teamId={selectedTeamId}
            />
          </>
        )}

        {activeTab === 'sessions' && (
          <TrainingSessionsList
            summaries={trainingSummaries}
            topics={topics}
            onRefresh={loadData}
            teamId={selectedTeamId}
          />
        )}

        {activeTab === 'matches' && (
          <MatchSummariesTab
            summaries={summaries}
            topics={topics}
            teamId={selectedTeamId}
            onRefresh={loadData}
            analyses={analyses}
          />
        )}

        {activeTab === 'players' && (
          <div className="space-y-4">
            <ProgramTrendsWidget
              programs={programs}
              players={players}
              onCreateTopic={(topic) => { setEditTopic({ title: topic, source: 'training', priority: 'medium' }); setActiveTab('topics'); }}
            />
            <PlayerDevelopmentList
              players={players}
              programs={programs}
              topics={topics}
              summaries={summaries}
              teamId={selectedTeamId}
              trainingEvaluations={trainingEvaluations}
              onRefresh={loadData}
            />
          </div>
        )}

        {activeTab === 'gameprep' && (
          <GamePrepTab
            teamId={selectedTeamId}
            team={teams.find(t => t.id === selectedTeamId)}
            players={players}
            matchAnalyses={analyses}
            onRefresh={loadData}
          />
        )}
      </div>

      {editTopic !== null && (
        <WorkTopicModal
          open={true}
          topic={editTopic}
          teamId={selectedTeamId}
          summaries={summaries}
          onClose={() => setEditTopic(null)}
          onSaved={() => { setEditTopic(null); loadData(); }}
        />
      )}
    </div>
  );
}