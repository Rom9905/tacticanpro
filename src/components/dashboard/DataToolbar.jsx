import React, { useState } from 'react';
import { PlusCircle, BarChart3, Calendar, Dumbbell, Swords, ClipboardList, Users, Brain, TrendingUp } from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import EventSummaryModal from '@/components/calendar/EventSummaryModal';
import CalendarView from '@/components/dashboard/CalendarView';

const TABS = [
  { id: 'input', label: 'הזנה', icon: PlusCircle },
  { id: 'insights', label: 'תובנות', icon: BarChart3 },
];

export default function DataToolbar({
  teamId, allEvents, weeklySchedule, onRefresh,
  onNavigate,
  needsSummaryEvents = [],
}) {
  const [activeTab, setActiveTab] = useState(null);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [summaryEvent, setSummaryEvent] = useState(null);

  const inputActions = [
    {
      id: 'calendar',
      label: 'לוח שנה',
      icon: Calendar,
      color: '#2A7050',
      bg: 'rgba(42,112,80,0.09)',
      border: 'rgba(42,112,80,0.22)',
      onClick: () => setActiveTab(activeTab === 'calendar_view' ? null : 'calendar_view'),
    },
    {
      id: 'add_training',
      label: 'הוסף אימון',
      icon: Dumbbell,
      color: '#2A7050',
      bg: 'rgba(42,112,80,0.09)',
      border: 'rgba(42,112,80,0.22)',
      onClick: () => setShowAddTraining(true),
    },
    {
      id: 'add_game',
      label: 'הוסף משחק',
      icon: Swords,
      color: '#2A5FA8',
      bg: 'rgba(41,82,168,0.09)',
      border: 'rgba(41,82,168,0.22)',
      onClick: () => setShowAddGame(true),
    },
    {
      id: 'summary_training',
      label: 'סיכום אימון',
      icon: ClipboardList,
      color: '#B97A2A',
      bg: 'rgba(185,122,42,0.09)',
      border: 'rgba(185,122,42,0.22)',
      onClick: () => {
        const ev = needsSummaryEvents.find(e => JSON.parse(e.notes || '{}')?.type === 'training');
        if (ev) setSummaryEvent(ev);
        else setSummaryEvent(needsSummaryEvents[0] || null);
      },
    },
    {
      id: 'summary_game',
      label: 'סיכום משחק',
      icon: ClipboardList,
      color: '#B94040',
      bg: 'rgba(185,64,64,0.09)',
      border: 'rgba(185,64,64,0.22)',
      onClick: () => {
        const ev = needsSummaryEvents.find(e => JSON.parse(e.notes || '{}')?.type !== 'training');
        if (ev) setSummaryEvent(ev);
        else setSummaryEvent(needsSummaryEvents[0] || null);
      },
    },
  ];

  const insightActions = [
    { id: 'match', label: 'תובנות משחקים', icon: Swords, color: '#2A5FA8', bg: 'rgba(41,82,168,0.09)', border: 'rgba(41,82,168,0.22)', view: 'match' },
    { id: 'training', label: 'תובנות אימונים', icon: Dumbbell, color: '#2A7050', bg: 'rgba(42,112,80,0.09)', border: 'rgba(42,112,80,0.22)', view: 'training' },
    { id: 'team', label: 'תובנות שחקנים', icon: Users, color: '#7A2A8A', bg: 'rgba(122,42,138,0.09)', border: 'rgba(122,42,138,0.22)', view: 'team' },
    { id: 'decision', label: 'השוואות שחקנים', icon: TrendingUp, color: '#B97A2A', bg: 'rgba(185,122,42,0.09)', border: 'rgba(185,122,42,0.22)', view: 'decision' },
    { id: 'assistant', label: 'המלצות AI', icon: Brain, color: '#B94040', bg: 'rgba(185,64,64,0.09)', border: 'rgba(185,64,64,0.22)', view: 'assistant' },
  ];

  return (
    <div className="mt-4" dir="rtl">
      {/* Tab bar */}
      <div className="flex gap-2 mb-3">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (activeTab === 'calendar_view' && tab.id === 'input');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(prev => prev === tab.id ? null : tab.id)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: isActive ? '#2A7050' : 'rgba(139,115,85,0.10)',
                color: isActive ? '#fff' : '#5C4E38',
                border: `1.5px solid ${isActive ? '#2A7050' : 'rgba(139,115,85,0.22)'}`,
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Input panel */}
      {(activeTab === 'input' || activeTab === 'calendar_view') && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
          <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>בחר פעולה</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {inputActions.map(action => {
              const Icon = action.icon;
              const isActive = action.id === 'calendar' && activeTab === 'calendar_view';
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: isActive ? action.bg : 'rgba(139,115,85,0.05)',
                    border: `1.5px solid ${isActive ? action.border : 'rgba(139,115,85,0.15)'}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                  <span className="text-xs font-medium text-center" style={{ color: '#5C4E38' }}>{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* Calendar inline view */}
          {activeTab === 'calendar_view' && (
            <div className="mt-2">
              <CalendarView
                teamId={teamId}
                events={allEvents}
                weeklySchedule={weeklySchedule}
                onRefresh={onRefresh}
              />
            </div>
          )}
        </div>
      )}

      {/* Insights panel */}
      {activeTab === 'insights' && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
          <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>בחר תצוגת תובנות</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {insightActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.view)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: 'rgba(139,115,85,0.05)',
                    border: '1.5px solid rgba(139,115,85,0.15)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = action.bg; e.currentTarget.style.borderColor = action.border; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(139,115,85,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,115,85,0.15)'; }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                  <span className="text-xs font-medium text-center" style={{ color: '#5C4E38' }}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
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
        <EventSummaryModal
          open={!!summaryEvent}
          onClose={() => setSummaryEvent(null)}
          event={summaryEvent}
          onSaved={() => { setSummaryEvent(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}