import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Dumbbell, Swords } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function parseNotes(notes) {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  // padding before
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HEB_DAYS_SHORT = ['א','ב','ג','ד','ה','ו','ש'];

export default function ScheduleWidget({ allEvents = [] }) {
  const [showModal, setShowModal] = useState(false);
  const [modalMonth, setModalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  const validEvents = allEvents.filter(e => e.status !== 'cancelled');

  const upcoming = validEvents
    .filter(e => new Date(e.game_date) >= now)
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

  const weekEvents = upcoming.filter(e => new Date(e.game_date) <= weekEnd);

  const nextTraining = upcoming.find(e => parseNotes(e.notes)?.type === 'training');
  const nextGame = upcoming.find(e => parseNotes(e.notes)?.type !== 'training');

  // Modal helpers
  const { year, month } = modalMonth;
  const days = getMonthDays(year, month);

  const eventsInModal = validEvents.filter(e => {
    const d = new Date(e.game_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const eventsOnDay = (day) => {
    if (!day) return [];
    return eventsInModal.filter(e => {
      const d = new Date(e.game_date);
      return d.getDate() === day.getDate();
    });
  };

  const prevMonth = () => setModalMonth(p => {
    if (p.month === 0) return { year: p.year - 1, month: 11 };
    return { year: p.year, month: p.month - 1 };
  });
  const nextMonth = () => setModalMonth(p => {
    if (p.month === 11) return { year: p.year + 1, month: 0 };
    return { year: p.year, month: p.month + 1 };
  });

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const EventPill = ({ ev, size = 'md' }) => {
    const notes = parseNotes(ev.notes);
    const isTraining = notes?.type === 'training';
    const small = size === 'sm';
    return (
      <div
        className={`flex items-center gap-1 rounded-md ${small ? 'px-1 py-0.5' : 'px-2 py-1'}`}
        style={{
          backgroundColor: isTraining ? 'rgba(42,112,80,0.10)' : 'rgba(41,82,168,0.10)',
          border: `1px solid ${isTraining ? 'rgba(42,112,80,0.25)' : 'rgba(41,82,168,0.25)'}`,
        }}
      >
        {isTraining
          ? <Dumbbell className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} style={{ color: '#2A7050' }} />
          : <Swords className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} style={{ color: '#2A5FA8' }} />}
        {!small && (
          <span className="text-xs font-medium truncate max-w-[90px]" style={{ color: isTraining ? '#2A7050' : '#2A5FA8' }}>
            {isTraining ? 'אימון' : ev.opponent}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}
        onClick={() => setShowModal(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between" style={{ color: '#2C2416' }}>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#2A7050' }} />
              לוח הזמנים
            </span>
            <span className="text-xs font-normal" style={{ color: '#9A8672' }}>לחץ לחודש מלא</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Next training */}
          <div className="flex items-center justify-between p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(42,112,80,0.07)', border: '1px solid rgba(42,112,80,0.18)' }}>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#2A7050' }}>אימון הבא</p>
                <p className="text-xs" style={{ color: '#5C4E38' }}>
                  {nextTraining ? formatDate(nextTraining.game_date) : 'לא מתוכנן'}
                </p>
              </div>
            </div>
            {nextTraining && (
              <span className="text-xs font-bold" style={{ color: '#2A7050' }}>{formatTime(nextTraining.game_date)}</span>
            )}
          </div>

          {/* Next game */}
          <div className="flex items-center justify-between p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(41,82,168,0.07)', border: '1px solid rgba(41,82,168,0.18)' }}>
            <div className="flex items-center gap-2">
              <Swords className="w-3.5 h-3.5" style={{ color: '#2A5FA8' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#2A5FA8' }}>משחק הבא</p>
                <p className="text-xs" style={{ color: '#5C4E38' }}>
                  {nextGame ? `מול ${nextGame.opponent} — ${formatDate(nextGame.game_date)}` : 'לא מתוכנן'}
                </p>
              </div>
            </div>
            {nextGame && (
              <span className="text-xs font-bold" style={{ color: '#2A5FA8' }}>{formatTime(nextGame.game_date)}</span>
            )}
          </div>

          {/* Week events list */}
          {weekEvents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: '#9A8672' }}>השבוע</p>
              <div className="space-y-1">
                {weekEvents.map(ev => {
                  const notes = parseNotes(ev.notes);
                  const isTraining = notes?.type === 'training';
                  const d = new Date(ev.game_date);
                  return (
                    <div key={ev.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isTraining
                          ? <Dumbbell className="w-3 h-3" style={{ color: '#2A7050' }} />
                          : <Swords className="w-3 h-3" style={{ color: '#2A5FA8' }} />}
                        <span className="text-xs" style={{ color: '#5C4E38' }}>
                          {isTraining ? 'אימון' : `מול ${ev.opponent}`}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: '#9A8672' }}>
                        {d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {weekEvents.length === 0 && !nextTraining && !nextGame && (
            <p className="text-xs text-center py-2" style={{ color: '#9A8672' }}>אין אירועים מתוכננים</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)' }} dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,115,85,0.18)' }}>
            <button onClick={prevMonth} className="p-1 rounded hover:bg-black/5">
              <ChevronRight className="w-4 h-4" style={{ color: '#7A6B57' }} />
            </button>
            <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
              {HEB_MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-black/5">
              <ChevronLeft className="w-4 h-4" style={{ color: '#7A6B57' }} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {HEB_DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold pb-1" style={{ color: '#9A8672' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px px-3 pb-3">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dayEvs = eventsOnDay(day);
              const isToday = day.toDateString() === now.toDateString();
              const isPast = day < now && !isToday;
              return (
                <div key={i} className="min-h-[52px] rounded-lg p-1"
                  style={{
                    backgroundColor: isToday ? 'rgba(42,112,80,0.10)' : isPast ? 'rgba(139,115,85,0.04)' : 'transparent',
                    border: isToday ? '1.5px solid rgba(42,112,80,0.35)' : '1px solid transparent',
                  }}>
                  <div className="text-[11px] font-medium text-center mb-0.5"
                    style={{ color: isToday ? '#2A7050' : isPast ? '#B5A490' : '#5C4E38' }}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvs.slice(0, 2).map(ev => (
                      <div key={ev.id} title={parseNotes(ev.notes)?.type === 'training' ? 'אימון' : `מול ${ev.opponent}`}>
                        <EventPill ev={ev} size="sm" />
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <span className="text-[9px]" style={{ color: '#9A8672' }}>+{dayEvs.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upcoming events list in modal */}
          <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
            <p className="text-xs font-semibold pt-3 mb-2" style={{ color: '#7A6B57' }}>אירועים קרובים</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {upcoming.slice(0, 8).map(ev => {
                const notes = parseNotes(ev.notes);
                const isTraining = notes?.type === 'training';
                return (
                  <div key={ev.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg"
                    style={{ backgroundColor: isTraining ? 'rgba(42,112,80,0.07)' : 'rgba(41,82,168,0.07)' }}>
                    {isTraining ? <Dumbbell className="w-3 h-3 flex-shrink-0" style={{ color: '#2A7050' }} /> : <Swords className="w-3 h-3 flex-shrink-0" style={{ color: '#2A5FA8' }} />}
                    <span className="flex-1 truncate" style={{ color: '#2C2416' }}>
                      {isTraining ? 'אימון' : `מול ${ev.opponent}`}
                    </span>
                    <span style={{ color: '#9A8672' }}>{formatDate(ev.game_date)}</span>
                  </div>
                );
              })}
              {upcoming.length === 0 && <p className="text-xs text-center py-2" style={{ color: '#9A8672' }}>אין אירועים מתוכננים</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}