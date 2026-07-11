import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { Loader2, Target, Dumbbell, Users, BarChart2, ArrowLeft } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

export default function TrainingCenter() {
  const navigate = useNavigate();
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
      const teamsData = await base44.entities.Team.filter({ created_by: userData.email });
      setTeams(teamsData);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedTeamId) loadData();
  }, [selectedTeamId]);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [topicsData, summariesData, playersData, programsData, analysesData, evalsData] = await Promise.all([
      base44.entities.TacticalGoal.filter({ team_id: selectedTeamId }, '-created_date', 100),
      base44.entities.ProfessionalSummary.filter({ team_id: selectedTeamId }, '-event_date', 60),
      base44.entities.Player.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingProgram.filter({ team_id: selectedTeamId }),
      base44.entities.MatchAnalysis.filter({ team_id: selectedTeamId, created_by: user.email }, '-date', 50),
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
        {/* Header */}
        <div className="pt-5 pb-4">
          <h1 className="text-xl font-bold" style={{ color: '#2C2416' }}>{isHe ? 'מרכז אימונים' : 'Training Center'}</h1>
          <p className="text-xs mt-0.5" style={{ color: '#9A8672' }}>
            {topics.filter(tp => tp.status === 'active').length} {isHe ? 'נושאים פעילים' : 'active topics'} ·{' '}
            {trainingSummaries.length} {isHe ? 'אימונים' : 'sessions'} ·{' '}
            {summaries.filter(s => s.event_type === 'match').length} {isHe ? 'משחקים' : 'matches'} ·{' '}
            {programs.filter(p => p.status === 'active').length} {isHe ? 'תוכניות שחקנים' : 'player programs'}
          </p>
        </div>

        {/* Analytics Banner */}
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(42,112,80,0.07)', border: '1px solid rgba(42,112,80,0.22)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(42,112,80,0.15)' }}>
              <BarChart2 className="w-4 h-4" style={{ color: '#2A7050' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#2C2416' }}>
                {isHe ? 'ניתוח האימונים שלך מוכן' : 'Your training analysis is ready'}
              </p>
              <p className="text-xs" style={{ color: '#7A6B57' }}>
                {trainingSummaries.length} {isHe ? 'אימונים בתקופה האחרונה' : 'sessions in recent period'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/?view=training')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: '#2A7050', color: '#fff' }}>
            {isHe ? 'לצפייה' : 'View'}
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl"
          style={{ backgroundColor: 'rgba(139,115,85,0.10)', border: '1px solid rgba(139,115,85,0.18)' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#2A7050' : 'transparent',
                  color: active ? '#fff' : '#5C4E38',
                }}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

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
          <div className="space-y-5">
            <ProgramTrendsWidget programs={programs} players={players} />
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