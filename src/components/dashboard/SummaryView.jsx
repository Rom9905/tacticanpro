import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Dumbbell, Users, BarChart3, Brain, ChevronRight, LayoutDashboard, PlusCircle, Lightbulb
} from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import ProfessionalSummaryModal from '@/components/calendar/ProfessionalSummaryModal';
import CoachDashboardTab from './CoachDashboardTab';
import InputTab from './InputTab';
import { useLang } from '@/lib/LanguageContext';
import { trackEvent } from '@/hooks/useAnalytics';

// ── Sub‑pages loaded inline ──────────────────────────────────────────────────
import MatchAnalysisPage from '@/pages/MatchAnalysis';
import TrainingAnalyticsPage from '@/pages/TrainingAnalytics';
import TeamManagementPage from '@/pages/TeamManagement';
import TrainingCenterPage from '@/pages/TrainingCenter';

const INSIGHT_VIEWS_CONFIG = [
  { id: 'training_center', labelKey: 'trainingCenter', icon: Dumbbell,  color: '#2A7050', bg: 'rgba(42,112,80,0.09)',  border: 'rgba(42,112,80,0.22)',  Component: TrainingCenterPage },
  { id: 'match',           labelKey: 'matchAnalysis',  icon: Swords,    color: '#2A5FA8', bg: 'rgba(41,82,168,0.09)',  border: 'rgba(41,82,168,0.22)',  Component: MatchAnalysisPage },
  { id: 'training',        labelKey: 'trainingAnalytics', icon: BarChart3, color: '#B97A2A', bg: 'rgba(185,122,42,0.09)', border: 'rgba(185,122,42,0.22)', Component: TrainingAnalyticsPage },
  { id: 'team',            labelKey: 'team',           icon: Users,     color: '#7A2A8A', bg: 'rgba(122,42,138,0.09)', border: 'rgba(122,42,138,0.22)', Component: TeamManagementPage },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const TAB_ORDER = { dashboard: 0, input: 1, insights: 2 };

export default function SummaryView({
  dashboardData, upcomingGames, allEvents, needsSummaryEvents,
  onFillSummary, teamId, weeklySchedule, onRefresh,
  players, matchAnalyses, tacticalGoals, professionalSummaries
}) {
  const { t, dir } = useLang();
  const db = t.dashboard;
  const ins = t.insights;

  const INSIGHT_VIEWS = INSIGHT_VIEWS_CONFIG.map(v => ({ ...v, label: ins[v.labelKey] }));
  const TABS = [
    { id: 'dashboard', label: db.statusView, icon: LayoutDashboard },
    { id: 'input',     label: db.input,      icon: PlusCircle },
    { id: 'insights',  label: db.insights,   icon: Lightbulb },
  ];

  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get('view');
  const openTeamManagement = urlParams.get('openTeamManagement');
  const urlTab = urlParams.get('tab');
  const urlPreselect = urlParams.get('preselect');
  const [tab, setTab] = useState(initialView ? 'insights' : 'dashboard');
  const [prevTab, setPrevTab] = useState('dashboard');
  const [insightView, setInsightView] = useState(initialView || (openTeamManagement ? 'team' : null));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view) {
      setTab('insights');
      setInsightView(view);
    }
  }, [window.location.search]);
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);

  // Auto-open team management if requested
  useEffect(() => {
    if (openTeamManagement === 'true') {
      setTab('insights');
      setInsightView('team');
    }
  }, [openTeamManagement]);

  if (!dashboardData) return null;

  const switchTab = (newTab) => {
    setPrevTab(tab);
    setTab(newTab);
    if (newTab !== 'insights') setInsightView(null);
    if (newTab === 'dashboard') trackEvent('open_dashboard');
    if (newTab === 'input') trackEvent('open_input');
    if (newTab === 'insights') trackEvent('open_insights');
  };

  const slideDir = TAB_ORDER[tab] > TAB_ORDER[prevTab] ? 1 : -1;

  const activeInsight = insightView ? INSIGHT_VIEWS.find(v => v.id === insightView) : null;

  return (
    <div className="space-y-4 pb-20 md:pb-0" dir={dir}>
      {/* ── Tab Bar (Desktop) — right below header, dark active tab ── */}
      <div className="hidden md:flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'rgba(13,26,18,.04)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: active ? '#0D1A12' : 'transparent',
                color: active ? '#4ADE80' : '#5C6B61',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(13,26,18,.05)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{ height: '64px', backgroundColor: '#0D1A12', borderTop: '1px solid rgba(74,222,128,.12)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1"
              style={{ color: active ? '#4ADE80' : 'rgba(255,255,255,.55)', minHeight: '44px' }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Animated Content ── */}
      <AnimatePresence mode="wait" custom={slideDir}>
        <motion.div
          key={tab + (insightView || '')}
          custom={slideDir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="space-y-4"
        >
          {/* ═══ DASHBOARD TAB ═══ */}
          {tab === 'dashboard' && (
            <CoachDashboardTab
              dashboardData={dashboardData}
              upcomingGames={upcomingGames}
              needsSummaryEvents={needsSummaryEvents}
              players={players || []}
              matchAnalyses={matchAnalyses || []}
              tacticalGoals={tacticalGoals || []}
              professionalSummaries={professionalSummaries || []}
              onGoInsight={(id) => { switchTab('insights'); setInsightView(id); }}
              onFillSummary={() => {
                // Open the first pending event or show a list
                if (needsSummaryEvents && needsSummaryEvents.length > 0) {
                  setSummaryEvent(needsSummaryEvents[0]);
                }
              }}
            />
          )}

          {/* ═══ INPUT TAB ═══ */}
          {tab === 'input' && (
            <InputTab
              teamId={teamId}
              allEvents={allEvents}
              needsSummaryEvents={needsSummaryEvents}
              onRefresh={onRefresh}
            />
          )}

          {/* ═══ INSIGHTS TAB ═══ */}
          {tab === 'insights' && (
            <>
              {!insightView && (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: '#9A8672' }}>{db.selectInsightView}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {INSIGHT_VIEWS.map(v => {
                      const Icon = v.icon;
                      return (
                        <button
                          key={v.id}
                          onClick={() => { setInsightView(v.id); trackEvent(`open_${v.id === 'training_center' ? 'training_center' : v.id === 'match' ? 'match_analysis' : v.id === 'training' ? 'training_analytics' : v.id === 'team' ? 'team_management' : v.id}`); }}
                          className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl transition-all"
                          style={{ backgroundColor: 'rgba(139,115,85,0.05)', border: '1.5px solid rgba(139,115,85,0.15)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = v.bg; e.currentTarget.style.borderColor = v.border; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(139,115,85,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,115,85,0.15)'; }}
                        >
                          <Icon className="w-5 h-5" style={{ color: v.color }} />
                          <span className="text-xs font-medium text-center" style={{ color: '#5C4E38' }}>{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {insightView && activeInsight && (
                <div>
                  <button
                    onClick={() => setInsightView(null)}
                    className="flex items-center gap-1 text-xs mb-3"
                    style={{ color: '#7A6B57' }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" /> {db.backToInsights}
                  </button>
                  {insightView === 'team' 
                    ? <TeamManagementPage initialTab={urlTab} initialPreselect={urlPreselect} />
                    : <activeInsight.Component />
                  }
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Modals ── */}
      <AddEventModal
        open={showAddTraining}
        onClose={() => setShowAddTraining(false)}
        teamId={teamId}
        defaultType="training"
        onSaved={() => { setShowAddTraining(false); onRefresh && onRefresh(); }}
      />
      <AddEventModal
        open={showAddGame}
        onClose={() => setShowAddGame(false)}
        teamId={teamId}
        defaultType="game"
        onSaved={() => { setShowAddGame(false); onRefresh && onRefresh(); }}
      />
      {summaryEvent && (
        <ProfessionalSummaryModal
          open={!!summaryEvent}
          onClose={() => setSummaryEvent(null)}
          event={summaryEvent}
          onSaved={() => { setSummaryEvent(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}