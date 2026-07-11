import React, { useState, useMemo } from 'react';
import { Calendar, Trophy, Activity, Plus, ChevronLeft, ChevronRight, CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AddEventModal from '@/components/calendar/AddEventModal';
import EventSummaryModal from '@/components/calendar/EventSummaryModal';
import { base44 } from '@/api/base44Client';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function parseNotes(notes) {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}

function isEventPast(event) {
  return new Date(event.game_date) < new Date();
}

function getEventStatus(event) {
  const parsedNotes = parseNotes(event.notes);
  if (event.status === 'completed') return 'summarized';
  if (isEventPast(event)) return 'needs_summary';
  return 'upcoming';
}

export default function CalendarView({ teamId, events = [], weeklySchedule = [], onRefresh }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState('training');
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (ev, e) => {
    e.stopPropagation();
    if (!window.confirm('למחוק אירוע זה?')) return;
    setDeletingId(ev.id);
    await base44.entities.GameSchedule.delete(ev.id);
    setDeletingId(null);
    onRefresh && onRefresh();
  };

  const handleGoogleSync = async () => {
    if (!teamId) return;
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', { teamId });
      setSyncStatus({ ok: true, count: res.data?.synced || 0 });
    } catch (e) {
      setSyncStatus({ ok: false });
    }
    setSyncing(false);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    return cells;
  }, [viewYear, viewMonth]);

  // Map events to dates — only manually created events, no auto-recurring
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const d = new Date(e.game_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      const parsedNotes = parseNotes(e.notes);
      map[key].push({ ...e, parsedNotes, isTraining: parsedNotes?.type === 'training' });
    });
    return map;
  }, [events, calendarDays]);

  // Events needing summary
  const needsSummary = events.filter(e => getEventStatus(e) === 'needs_summary');

  const handleEventClick = (event) => {
    if (event._recurring) return;
    if (getEventStatus(event) === 'needs_summary') {
      setSummaryEvent({ ...event, parsedNotes: parseNotes(event.notes) });
    }
  };

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="space-y-4">
      {/* Pending summaries banner */}
      {needsSummary.length > 0 && (
        <div className="p-3 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: 'rgba(180,140,30,0.10)', border: '1.5px solid rgba(180,140,30,0.30)' }}>
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#B97A2A' }} />
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: '#B97A2A' }}>
              {needsSummary.length} אירוע{needsSummary.length > 1 ? 'ים' : ''} ממתין{needsSummary.length > 1 ? 'ים' : ''} לסיכום
            </span>
          </div>
          <Button size="sm" onClick={() => setSummaryEvent({ ...needsSummary[0], parsedNotes: parseNotes(needsSummary[0].notes) })}
            style={{ backgroundColor: '#B97A2A', color: '#fff', fontSize: '12px' }}>
            סכם עכשיו
          </Button>
        </div>
      )}

      <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.20)' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth} style={{ color: '#7A6B57' }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="font-bold text-base" style={{ color: '#2C2416' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} style={{ color: '#7A6B57' }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => { setAddDefaultType('training'); setShowAddModal(true); }}
                className="gap-1 text-xs" style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.30)' }}>
                <Plus className="w-3 h-3" /> אימון
              </Button>
              <Button size="sm" onClick={() => { setAddDefaultType('game'); setShowAddModal(true); }}
                className="gap-1 text-xs" style={{ backgroundColor: 'rgba(41,82,168,0.10)', color: '#2A5FA8', border: '1px solid rgba(41,82,168,0.28)' }}>
                <Plus className="w-3 h-3" /> משחק
              </Button>
              <Button size="sm" onClick={handleGoogleSync} disabled={syncing}
                className="gap-1 text-xs" style={{ backgroundColor: 'rgba(66,133,244,0.10)', color: '#4285F4', border: '1px solid rgba(66,133,244,0.28)' }}>
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'מסנכרן...' : 'Google Calendar'}
              </Button>
            </div>
            {syncStatus && (
              <div className="mt-2 text-xs px-2 py-1 rounded" style={{
                backgroundColor: syncStatus.ok ? 'rgba(42,112,80,0.10)' : 'rgba(200,50,50,0.10)',
                color: syncStatus.ok ? '#2A7050' : '#B94040'
              }}>
                {syncStatus.ok ? `✓ סונכרנו ${syncStatus.count} אירועים ל-Google Calendar` : '✗ שגיאה בסנכרון'}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: '#9A8672' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const isToday = key === todayKey;
              const isPast = day < today && !isToday;
              const dayEvents = eventsByDate[key] || [];

              return (
                <div key={key} className="min-h-[70px] rounded-lg p-1 flex flex-col"
                  style={{
                    backgroundColor: isToday ? 'rgba(42,112,80,0.10)' : isPast ? 'rgba(139,115,85,0.04)' : 'rgba(139,115,85,0.05)',
                    border: isToday ? '1.5px solid rgba(42,112,80,0.35)' : '1px solid rgba(139,115,85,0.12)',
                  }}>
                  <div className="text-center mb-1">
                    <span className="text-xs font-semibold"
                      style={{ color: isToday ? '#2A7050' : isPast ? '#C8BFB3' : '#5C4E38' }}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5 flex-1">
                    {dayEvents.map((ev, ei) => {
                      const status = getEventStatus(ev);
                      const isGame = !ev.isTraining;

                      // Colors per type + status
                      let bg, border, textColor, statusDot;
                      if (status === 'summarized') {
                        bg = 'rgba(42,112,80,0.13)'; border = 'rgba(42,112,80,0.35)'; textColor = '#2A7050'; statusDot = '🟢';
                      } else if (status === 'needs_summary') {
                        bg = 'rgba(200,50,50,0.10)'; border = 'rgba(200,50,50,0.35)'; textColor = '#B94040'; statusDot = '🔴';
                      } else if (isGame) {
                        bg = 'rgba(41,82,168,0.12)'; border = 'rgba(41,82,168,0.28)'; textColor = '#2A5FA8'; statusDot = '';
                      } else {
                        bg = 'rgba(42,112,80,0.09)'; border = 'rgba(42,112,80,0.22)'; textColor = '#2A7050'; statusDot = '';
                      }

                      return (
                        <div key={ei} className="w-full rounded px-1 py-0.5 flex items-center gap-0.5 group"
                          style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                          <button onClick={() => handleEventClick(ev)} className="flex-1 text-right min-w-0">
                            <span className="text-[8px] font-medium leading-tight block truncate" style={{ color: textColor }}>
                              {statusDot && <span className="mr-0.5" style={{ fontSize: '6px' }}>{statusDot}</span>}
                              {isGame ? `⚽ ${ev.opponent}` : '🏃 אימון'}
                            </span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(ev, e)}
                            disabled={deletingId === ev.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: '#B94040' }}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 flex-wrap"
            style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
            {[
              { color: 'rgba(41,82,168,0.20)', label: '⚽ משחק' },
              { color: 'rgba(42,112,80,0.12)', label: '🏃 אימון' },
              { color: 'rgba(200,50,50,0.15)', label: '🔴 ממתין לסיכום' },
              { color: 'rgba(42,112,80,0.20)', label: '🟢 סוכם' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[10px]" style={{ color: '#9A8672' }}>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        teamId={teamId}
        defaultType={addDefaultType}
        onSaved={onRefresh}
      />

      <EventSummaryModal
        open={!!summaryEvent}
        onClose={() => setSummaryEvent(null)}
        event={summaryEvent}
        onSaved={() => { setSummaryEvent(null); onRefresh && onRefresh(); }}
      />
    </div>
  );
}