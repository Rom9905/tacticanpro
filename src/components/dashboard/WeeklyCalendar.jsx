import React, { useMemo } from 'react';
import { Calendar, Clock, Trophy, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export default function WeeklyCalendar({ weeklySchedule = [], upcomingGames = [] }) {
  const weekDays = useMemo(() => getWeekDays(), []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map games to their weekday index this week
  const gamesByDay = useMemo(() => {
    const map = {};
    upcomingGames.forEach(g => {
      const gDate = new Date(g.game_date);
      gDate.setHours(0, 0, 0, 0);
      weekDays.forEach((d, idx) => {
        const wd = new Date(d);
        wd.setHours(0, 0, 0, 0);
        if (wd.getTime() === gDate.getTime()) {
          if (!map[idx]) map[idx] = [];
          map[idx].push(g);
        }
      });
    });
    return map;
  }, [upcomingGames, weekDays]);

  // Map recurring schedule to day index
  const scheduleByDay = useMemo(() => {
    const map = {};
    weeklySchedule.forEach(entry => {
      const idx = entry.day;
      if (!map[idx]) map[idx] = [];
      map[idx].push(entry);
    });
    return map;
  }, [weeklySchedule]);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4 text-violet-400" />
          לוח שנה שבועי
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const isToday = dayStart.getTime() === today.getTime();
            const isPast = dayStart < today;
            const games = gamesByDay[idx] || [];
            const trainings = scheduleByDay[idx] || [];
            const hasEvents = games.length > 0 || trainings.length > 0;

            return (
              <div
                key={idx}
                className={`rounded-lg p-2 min-h-[90px] flex flex-col transition-all ${
                  isToday
                    ? 'bg-emerald-500/15 border border-emerald-500/40'
                    : isPast
                    ? 'bg-slate-900/30 opacity-50'
                    : 'bg-slate-800/40 border border-slate-700/30'
                }`}
              >
                {/* Day header */}
                <div className="flex flex-col items-center mb-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {DAY_NAMES[idx]}
                  </span>
                  <span className={`text-sm font-bold ${isToday ? 'text-emerald-300' : isPast ? 'text-slate-600' : 'text-white'}`}>
                    {day.getDate()}
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-1 flex-1">
                  {games.map((g, gi) => (
                    <div
                      key={gi}
                      className="bg-blue-500/20 border border-blue-500/40 rounded p-1 text-center"
                    >
                      <Trophy className="w-2.5 h-2.5 text-blue-400 mx-auto mb-0.5" />
                      <p className="text-[9px] text-blue-300 font-medium leading-tight truncate">
                        {g.opponent}
                      </p>
                      <p className="text-[8px] text-blue-400/70">
                        {new Date(g.game_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}

                  {trainings.map((t, ti) => (
                    <div
                      key={ti}
                      className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1 text-center"
                    >
                      <Activity className="w-2.5 h-2.5 text-emerald-400 mx-auto mb-0.5" />
                      <p className="text-[9px] text-emerald-300 font-medium">
                        אימון
                      </p>
                      <p className="text-[8px] text-emerald-400/70">
                        {t.time}
                      </p>
                    </div>
                  ))}

                  {!hasEvents && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[9px] text-slate-700">—</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}