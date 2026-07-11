import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Dumbbell, Swords, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AddEventModal from '@/components/calendar/AddEventModal';
import EventSummaryModal from '@/components/calendar/EventSummaryModal';
import { base44 } from '@/api/base44Client';

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function parseNotes(notes) {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}

function isEventPast(event) {
  return new Date(event.game_date) < new Date();
}

function getEventStatus(event) {
  if (event.status === 'completed') return 'summarized';
  if (isEventPast(event)) return 'needs_summary';
  return 'upcoming';
}

export default function MiniCalendar({ teamId, events = [], onRefresh }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState('training');
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    return cells;
  }, [viewYear, viewMonth]);

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
  }, [events]);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const selectedDayKey = selectedDay
    ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
    : null;
  const selectedDayEvents = selectedDayKey ? (eventsByDate[selectedDayKey] || []) : [];

  const handleDelete = async (ev) => {
    if (!window.confirm('למחוק אירוע זה?')) return;
    setDeletingId(ev.id);
    await base44.entities.GameSchedule.delete(ev.id);
    setDeletingId(null);
    onRefresh && onRefresh();
  };

  const openAdd = (type) => {
    setAddDefaultType(type);
    setShowAddModal(true);
  };

  const formatDayLabel = (day) => {
    if (!day) return '';
    return day.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-black/5">
          <ChevronRight className="w-4 h-4" style={{ color: '#7A6B57' }} />
        </button>
        <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-black/5">
          <ChevronLeft className="w-4 h-4" style={{ color: '#7A6B57' }} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold py-0.5" style={{ color: '#9A8672' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="min-h-[44px]" />;
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isToday = key === todayKey;
          const isPast = day < today && !isToday;
          const isSelected = selectedDayKey === key;
          const dayEvents = eventsByDate[key] || [];
          const hasTraining = dayEvents.some(e => e.isTraining);
          const hasGame = dayEvents.some(e => !e.isTraining);
          const hasNeedsSummary = dayEvents.some(e => getEventStatus(e) === 'needs_summary');

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className="min-h-[44px] rounded-lg p-1 flex flex-col items-center gap-0.5 transition-all"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(42,112,80,0.18)'
                  : isToday
                  ? 'rgba(42,112,80,0.10)'
                  : isPast
                  ? 'rgba(139,115,85,0.03)'
                  : 'rgba(139,115,85,0.05)',
                border: isSelected
                  ? '1.5px solid rgba(42,112,80,0.50)'
                  : isToday
                  ? '1.5px solid rgba(42,112,80,0.30)'
                  : '1px solid rgba(139,115,85,0.10)',
              }}
            >
              <span className="text-[11px] font-semibold"
                style={{ color: isToday ? '#2A7050' : isPast ? '#C8BFB3' : '#5C4E38' }}>
                {day.getDate()}
              </span>
              {/* Event dots */}
              <div className="flex gap-0.5 flex-wrap justify-center">
                {hasNeedsSummary && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#B94040' }} />
                )}
                {hasTraining && !hasNeedsSummary && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2A7050' }} />
                )}
                {hasGame && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2A5FA8' }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#2A7050' }} />
          <span className="text-[10px]" style={{ color: '#9A8672' }}>אימון</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#2A5FA8' }} />
          <span className="text-[10px]" style={{ color: '#9A8672' }}>משחק</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#B94040' }} />
          <span className="text-[10px]" style={{ color: '#9A8672' }}>ממתין לסיכום</span>
        </div>
      </div>

      {/* Day detail popup */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden" style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)' }} dir="rtl">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,115,85,0.18)' }}>
            <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>{formatDayLabel(selectedDay)}</span>
            <button onClick={() => setSelectedDay(null)}><X className="w-4 h-4" style={{ color: '#9A8672' }} /></button>
          </div>

          <div className="px-4 py-3 space-y-2">
            {selectedDayEvents.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: '#9A8672' }}>אין אירועים ביום זה</p>
            )}
            {selectedDayEvents.map(ev => {
              const status = getEventStatus(ev);
              const isGame = !ev.isTraining;
              const d = new Date(ev.game_date);
              const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{
                    backgroundColor: isGame ? 'rgba(41,82,168,0.08)' : 'rgba(42,112,80,0.08)',
                    border: `1px solid ${isGame ? 'rgba(41,82,168,0.22)' : 'rgba(42,112,80,0.22)'}`,
                  }}>
                  <div className="flex items-center gap-2">
                    {isGame
                      ? <Swords className="w-3.5 h-3.5" style={{ color: '#2A5FA8' }} />
                      : <Dumbbell className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />}
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2C2416' }}>
                        {isGame ? `מול ${ev.opponent}` : 'אימון'}
                      </p>
                      <p className="text-xs" style={{ color: '#9A8672' }}>{timeStr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === 'needs_summary' && (
                      <Button size="sm" onClick={() => { setSummaryEvent({ ...ev }); setSelectedDay(null); }}
                        style={{ backgroundColor: '#B97A2A', color: '#fff', fontSize: '10px', height: '24px', padding: '0 8px' }}>
                        סכם
                      </Button>
                    )}
                    <button onClick={() => handleDelete(ev)} disabled={deletingId === ev.id}
                      className="p-1 rounded hover:bg-black/5" style={{ color: '#B94040' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add buttons */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => { openAdd('training'); setSelectedDay(null); }}
                className="flex-1 gap-1 text-xs"
                style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.30)' }}>
                <Plus className="w-3 h-3" /> הוסף אימון
              </Button>
              <Button size="sm" onClick={() => { openAdd('game'); setSelectedDay(null); }}
                className="flex-1 gap-1 text-xs"
                style={{ backgroundColor: 'rgba(41,82,168,0.10)', color: '#2A5FA8', border: '1px solid rgba(41,82,168,0.28)' }}>
                <Plus className="w-3 h-3" /> הוסף משחק
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        teamId={teamId}
        defaultType={addDefaultType}
        onSaved={() => { setShowAddModal(false); onRefresh && onRefresh(); }}
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