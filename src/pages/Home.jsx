import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { Loader2, TrendingUp, TrendingDown, Activity, AlertCircle, User, ShieldCheck, FileText } from 'lucide-react';
import { updateDeadlinesForGame } from '@/components/schedule/DeadlineCalculator';
import { trackEvent } from '@/hooks/useAnalytics';
import LandingPage from '@/components/LandingPage';
import SetupWizard from '@/components/setup/SetupWizard';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import SummaryView from '@/components/dashboard/SummaryView';
import EventSummaryModal from '@/components/calendar/EventSummaryModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function parseNotes(notes) {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}
function isEventPast(ev) { return new Date(ev.game_date) < new Date(); }
function eventNeedsSummary(ev) { return ev.status !== 'completed' && isEventPast(ev); }

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(null);
  const { selectedTeamId, selectTeam } = useTeam();
  const [dashboardData, setDashboardData] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [showNewTeamWizard, setShowNewTeamWizard] = useState(false);
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [dashboardPlayers, setDashboardPlayers] = useState([]);
  const [dashboardMatchAnalyses, setDashboardMatchAnalyses] = useState([]);
  const [tacticalGoals, setTacticalGoals] = useState([]);
  const [professionalSummaries, setProfessionalSummaries] = useState([]);
  const [incompletePlayers, setIncompletePlayers] = useState([]);
  const [showPlayerAlert, setShowPlayerAlert] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        trackEvent('login', { email: userData.email });
        const hasAccess = userData.role === 'admin' || userData.access_status === 'paid' || userData.access_status === 'manual_access';
        if (!hasAccess) {
          setHasPlan(false);
          setLoading(false);
          return;
        }
        setHasPlan(true);
        const teamsData = await base44.entities.Team.filter({ created_by: userData.email });
        setTeams(teamsData);
        if (teamsData.length === 0) { setSetupRequired(true); setLoading(false); return; }
        const teamId = selectedTeamId || teamsData[0].id;
        if (!selectedTeamId) selectTeam(teamsData[0].id);
        const players = await base44.entities.Player.filter({ team_id: teamId, created_by: userData.email });
        if (players.length < 15) { setSetupRequired(true); setLoading(false); return; }
        setSetupRequired(false);
        setLoading(false);
        // Load dashboard immediately for the resolved team
        loadDashboard(teamId, userData);
      } catch (e) { console.error(e); setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    // Only re-load when user manually switches teams (not on initial load)
    if (selectedTeamId && !setupRequired && user && dashboardData) {
      loadDashboard();
    }
  }, [selectedTeamId]);

  const handleSetupComplete = async (teamId) => {
    if (!teamId) {
      // User clicked back to home
      setShowNewTeamWizard(false);
      return;
    }
    const teamsData = await base44.entities.Team.filter({ created_by: user.email });
    setTeams(teamsData);
    selectTeam(teamId);
    setSetupRequired(false);
    setShowNewTeamWizard(false);
  };

  const loadDashboard = async (teamId = selectedTeamId, currentUser = user) => {
    if (!teamId || !currentUser) return;
    try {
      const [trainingActions, decisionSummaries, situations, trainingPrograms, matchAnalyses, players, gameSchedules, goals, profSummaries] = await Promise.all([
        base44.entities.TrainingAction.filter({ team_id: teamId, status: 'pending', created_by: currentUser.email }),
        base44.entities.MatchDecisionSummary.filter({ team_id: teamId, created_by: currentUser.email }, '-created_date', 20),
        base44.entities.KeyMatchSituation.filter({ team_id: teamId, status: 'active', created_by: currentUser.email }),
        base44.entities.TrainingProgram.filter({ team_id: teamId, status: 'active', created_by: currentUser.email }),
        base44.entities.MatchAnalysis.filter({ team_id: teamId, created_by: currentUser.email }, '-date', 50),
        base44.entities.Player.filter({ team_id: teamId, created_by: currentUser.email }),
        base44.entities.GameSchedule.filter({ team_id: teamId, created_by: currentUser.email }, 'game_date', 100),
        base44.entities.TacticalGoal.filter({ team_id: teamId }, '-created_date', 30),
        base44.entities.ProfessionalSummary.filter({ team_id: teamId }, '-event_date', 50),
      ]);

      // Player completeness check (merged — reuses already-fetched players)
      const incomplete = players.filter(p =>
        !p.position ||
        !p.number ||
        !p.strengths?.length ||
        !p.improvements?.length ||
        !p.skill_ratings
      );
      setIncompletePlayers(incomplete);
      setShowPlayerAlert(incomplete.length > 0);

      const now = new Date();
      const validEvents = gameSchedules.filter(g => g.status !== 'cancelled');
      const upcoming = validEvents.filter(g => new Date(g.game_date) > now).sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
      setUpcomingGames(upcoming);
      setAllEvents(validEvents);
      setDashboardPlayers(players);
      setDashboardMatchAnalyses(matchAnalyses);
      setTacticalGoals(goals);
      setProfessionalSummaries(profSummaries);

      const nextGame = upcoming[0] || null;
      const successRate = decisionSummaries.length > 0
        ? (decisionSummaries.filter(d => d.outcome === 'מוצלח').length / decisionSummaries.length) * 100 : 0;

      let professionalStatus = 'יציב';
      let statusIcon = Activity;
      let statusColor = 'text-blue-400';
      if (successRate > 70) { professionalStatus = 'בעלייה'; statusIcon = TrendingUp; statusColor = 'text-emerald-400'; }
      else if (successRate < 40) { professionalStatus = 'דורש שיפור'; statusIcon = TrendingDown; statusColor = 'text-red-400'; }

      const openIssues = decisionSummaries.filter(d => d.outcome === 'בעייתי').length;
      const pendingTraining = trainingActions.length + trainingPrograms.length;
      const newInsights = decisionSummaries.filter(d => new Date(d.created_date) >= new Date(Date.now() - 7 * 86400000)).length;

      const recurringIssues = {};
      decisionSummaries.filter(d => d.outcome === 'בעייתי').forEach(d => {
        const sit = situations.find(s => s.id === d.situation_id);
        if (sit) recurringIssues[sit.situation_name] = (recurringIssues[sit.situation_name] || 0) + 1;
      });
      const criticalIssue = Object.entries(recurringIssues).sort((a, b) => b[1] - a[1])[0];

      const trendData = decisionSummaries.slice(0, 10).reverse().map(d => ({
        date: new Date(d.match_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        score: d.outcome === 'מוצלח' ? 100 : d.outcome === 'בעייתי' ? 0 : 50,
      }));

      const issuesWithDeadlines = updateDeadlinesForGame(
        Object.entries(recurringIssues).map(([issue, count]) => ({
          title: issue, severity: count >= 3 ? 'critical' : count >= 2 ? 'high' : 'medium', count
        })),
        nextGame
      );
      const urgentIssuesCount = issuesWithDeadlines.filter(i => ['overdue', 'urgent', 'soon'].includes(i.deadline_status?.status)).length;

      const actionPriorities = [];
      issuesWithDeadlines.filter(i => i.severity === 'critical' || i.severity === 'high').forEach(issue => {
        const rel = decisionSummaries.filter(d => { const sit = situations.find(s => s.id === d.situation_id); return sit?.situation_name === issue.title && d.outcome === 'בעייתי'; });
        actionPriorities.push({
          type: 'critical_issue', title: issue.title, severity: issue.severity, urgency: issue.count,
          description: `חזר ${issue.count} פעמים`, deadline: issue.deadline, deadlineStatus: issue.deadline_status,
          actionLabel: 'צור אימון', actionPage: 'TrainingCenter',
          daysOpen: rel.length > 0 ? Math.max(0, ...rel.map(d => Math.floor((Date.now() - new Date(d.created_date)) / 86400000))) : 0
        });
      });
      trainingActions.filter(t => t.priority === 'high').slice(0, 2).forEach(t => {
        actionPriorities.push({
          type: 'pending_training', title: t.pattern_situation, severity: 'high', urgency: 2,
          description: 'אימון ממתין', actionLabel: 'צפה', actionPage: 'TrainingCenter',
          daysOpen: Math.floor((Date.now() - new Date(t.created_date)) / 86400000)
        });
      });
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      actionPriorities.sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0));

      setDashboardData({
        professionalStatus, statusIcon, statusColor, successRate, openIssues,
        pendingTraining, newInsights, criticalIssue, trendData,
        actionPriorities: actionPriorities.slice(0, 5), nextGame, urgentIssuesCount,
        weeklySchedule: currentUser.weekly_schedule || []
      });
    } catch (e) { console.error(e); }
  };

  const needsSummaryEvents = allEvents.filter(eventNeedsSummary).map(e => ({ ...e, parsedNotes: parseNotes(e.notes) }));

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F4EE' }} dir="rtl">
      <div style={{ height: '64px', backgroundColor: '#0D1A12' }} />
      <div className="pt-5 px-4 md:px-6 max-w-5xl mx-auto">
        <DashboardSkeleton />
      </div>
    </div>
  );

  if (!user) return <LandingPage />;

  if (hasPlan === false) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F4EE' }}>
      <p style={{ color: '#5C4E38' }}>אין לך גישה. פנה למנהל המערכת.</p>
    </div>
  );

  if (setupRequired) {
    return <SetupWizard onComplete={handleSetupComplete} allowBackToHome={false} />;
  }

  if (showNewTeamWizard) {
    return <SetupWizard onComplete={handleSetupComplete} allowBackToHome={true} />;
  }

  const FallbackLoader = <DashboardSkeleton />;

  const renderView = () => {
    return (
      <SummaryView
        dashboardData={dashboardData}
        upcomingGames={upcomingGames}
        allEvents={allEvents}
        needsSummaryEvents={needsSummaryEvents}
        onFillSummary={(ev) => setSummaryEvent(ev || needsSummaryEvents[0])}
        teamId={selectedTeamId}
        weeklySchedule={dashboardData?.weeklySchedule || []}
        onRefresh={loadDashboard}
        players={dashboardPlayers}
        matchAnalyses={dashboardMatchAnalyses}
        tacticalGoals={tacticalGoals}
        professionalSummaries={professionalSummaries}
      />
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F4EE' }} dir="rtl">
      {/* Sticky top bar */}
      <DashboardTopBar
        user={user}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={selectTeam}
        onNewTeam={() => setShowNewTeamWizard(true)}
        teamId={selectedTeamId}
        onTeamDeleted={async () => {
          const teamsData = await base44.entities.Team.filter({ created_by: user.email });
          setTeams(teamsData);
          if (teamsData.length === 0) {
            setSetupRequired(true);
          } else {
            selectTeam(teamsData[0].id);
          }
        }}
      />

      {/* Quick links row — admin only (match analysis moved to header) */}
      {user?.role === 'admin' && (
        <div className="px-4 pt-20 max-w-5xl mx-auto flex flex-wrap gap-2">
          <a
            href="/user-management"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-fit"
            style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.22)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            ניהול גישות משתמשים
          </a>
          <a
            href="/admin-analytics"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-fit"
            style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.22)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            אנליטיקס
          </a>
        </div>
      )}

      {/* Main content */}
      <div className={`${user?.role === 'admin' ? 'pt-2' : 'pt-20'} px-4 md:px-6 pb-10 max-w-5xl mx-auto`}>
        {/* Player completion alert */}
        {showPlayerAlert && (
          <div className="mb-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#FAF7F2', border: '1.5px solid rgba(217,119,6,0.25)' }}>
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(217,119,6,0.12)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: '#D97706' }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h4 className="font-bold text-base mb-1" style={{ color: '#D97706' }}>
                  ⚠️ פרטי שחקנים חסרים
                </h4>
                
                {/* Explanation */}
                <p className="text-sm mb-3" style={{ color: '#5C4E38' }}>
                  זיהינו {incompletePlayers.length} שחקן{incompletePlayers.length > 1 ? 'ים' : ''} עם מידע חסר. השלמת הפרטים תאפשר למערכת לספק ניתוחים מדויקים יותר ותוכניות אימון מותאמות אישית.
                </p>

                {/* Players list */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {incompletePlayers.slice(0, 5).map(p => (
                    <span key={p.id} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
                      <User className="w-3 h-3 inline ml-1 -mt-0.5" />
                      {p.name}
                    </span>
                  ))}
                  {incompletePlayers.length > 5 && (
                    <span className="text-xs px-2.5 py-1 font-medium" style={{ color: '#9A8672' }}>
                      +{incompletePlayers.length - 5} נוספים
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowPlayerAlert(false);
                      navigate('/Home?openTeamManagement=true');
                      window.location.reload();
                    }}
                    style={{ backgroundColor: '#D97706', color: '#fff' }}
                    className="text-sm font-semibold hover:opacity-90"
                  >
                    השלם עכשיו →
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPlayerAlert(false)}
                    className="text-sm"
                    style={{ color: '#9A8672' }}
                  >
                    אחר כך
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {dashboardData ? renderView() : FallbackLoader}
      </div>

      {/* Event summary modal */}
      <EventSummaryModal
        open={!!summaryEvent}
        onClose={() => setSummaryEvent(null)}
        event={summaryEvent}
        onSaved={() => { setSummaryEvent(null); loadDashboard(); }}
      />
    </div>
  );
}