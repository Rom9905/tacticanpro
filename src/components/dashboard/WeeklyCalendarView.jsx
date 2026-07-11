import React from 'react';
import { Dumbbell, Swords } from 'lucide-react';

const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function parseNotes(notes) {
  try { return JSON.parse(notes || '{}'); } catch { return {}; }
}

export default function WeeklyCalendarView({ events = [], onSummarize }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const eventsByDay = {};
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  events.forEach(e => {
    const d = new Date(e.game_date);
    if (d < today || d > weekEnd) return;
    const key = d.toDateString();
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  });

  return (
    <div className="grid grid-cols-7 gap-1" dir="rtl">
      {weekDays.map((day, i) => {
        const isToday = day.toDateString() === new Date().toDateString();
        const dayEvents = eventsByDay[day.toDateString()] || [];
        return (
          <div key={i} className="flex flex-col min-h-[80px] rounded-lg p-1.5"
            style={{
              backgroundColor: isToday ? 'rgba(42,112,80,0.08)' : 'rgba(139,115,85,0.04)',
              border: `1px solid ${isToday ? 'rgba(42,112,80,0.30)' : 'rgba(139,115,85,0.14)'}`,
            }}>
            <div className="text-center mb-1">
              <p className="text-[10px] font-semibold" style={{ color: isToday ? '#2A7050' : '#9A8672' }}>
                {DAY_LABELS[day.getDay()]}
              </p>
              <p className="text-xs font-bold" style={{ color: isToday ? '#2A7050' : '#2C2416' }}>
                {day.getDate()}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              {dayEvents.map(ev => {
                const parsed = parseNotes(ev.notes);
                const isTraining = parsed?.type === 'training';
                const d = new Date(ev.game_date);
                const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={ev.id} className="rounded px-1 py-0.5"
                    style={{
                      backgroundColor: isTraining ? 'rgba(42,112,80,0.14)' : 'rgba(41,82,168,0.14)',
                    }}>
                    <div className="flex items-center gap-0.5">
                      {isTraining
                        ? <Dumbbell className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#2A7050' }} />
                        : <Swords className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#2A5FA8' }} />}
                      <span className="text-[9px] font-medium truncate" style={{ color: isTraining ? '#2A7050' : '#2A5FA8' }}>
                        {isTraining ? 'אימון' : ev.opponent}
                      </span>
                    </div>
                    <span className="text-[9px]" style={{ color: '#9A8672' }}>{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}