import React, { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import {
  Clock, Calendar, Dumbbell, Swords,
  CalendarDays, Check
} from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import ProfessionalSummaryModal from '@/components/calendar/ProfessionalSummaryModal';
import FullCalendarModal from '@/components/dashboard/FullCalendarModal';

export default function InputTab({ teamId, allEvents, needsSummaryEvents, onRefresh }) {
  const { t, dir: _dir, lang: _lang } = useLang();
  const inp = t.input;

  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  const weekEvents = (allEvents || []).filter(e => {
    const d = new Date(e.game_date);
    return d >= now && d <= weekFromNow;
  }).sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

  // Summarized events (not in needsSummaryEvents)
  const _summarizedWeekEvents = weekEvents.filter(ev =>
    !needsSummaryEvents?.find(nse => nse.id === ev.id)
  );

  return (
    <div className="space-y-4 pb-20 md:pb-0" dir="rtl">
      {/* Quick Actions — 50/50 action cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowAddTraining(true)}
          className="premium-card premium-card-clickable p-4 flex flex-col items-center gap-2"
          style={{ border: '1px solid rgba(13,26,18,.08)' }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(13,26,18,.05)' }}>
            <Dumbbell className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{inp.addTraining}</span>
        </button>
        <button onClick={() => setShowAddGame(true)}
          className="premium-card premium-card-clickable p-4 flex flex-col items-center gap-2"
          style={{ border: '1.5px solid rgba(22,163,74,.30)', backgroundColor: 'var(--success-bg)' }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--brand-green)' }}>
            <Swords className="w-6 h-6" style={{ color: '#0D1A12' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--brand-green-dark)' }}>{inp.addGame}</span>
        </button>
      </div>

      {/* Pending Summaries */}
      {needsSummaryEvents?.length > 0 && (
        <div className="premium-card" style={{ border: '1px solid rgba(13,26,18,.08)', borderRight: '4px solid var(--warning)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{inp.pendingSummaries}</span>
          </div>
          <div className="px-4 pb-3 space-y-2 pt-1">
            {needsSummaryEvents.map((ev, idx) => {
              const isTraining = ev.parsedNotes?.type === 'training';
              const d = new Date(ev.game_date);
              const isTop = idx === 0;
              return (
                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,.06)' }}>
                  <div className="flex items-center gap-2">
                    {isTraining
                      ? <Dumbbell className="w-3.5 h-3.5" style={{ color: 'var(--brand-green-dark)' }} />
                      : <Swords className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} />}
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {isTraining ? inp.training : `מול ${ev.opponent}`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                      {inp.awaitingSummary}
                    </span>
                  </div>
                  <button onClick={() => setSummaryEvent(ev)}
                    className={isTop ? 'premium-btn-green flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs' : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all'}
                    style={isTop ? {} : { color: 'var(--brand-green-dark)', border: '1px solid rgba(22,163,74,.30)', backgroundColor: 'transparent', minHeight: '36px' }}
                    onMouseEnter={!isTop ? (e) => { e.currentTarget.style.backgroundColor = 'var(--success-bg)'; } : undefined}
                    onMouseLeave={!isTop ? (e) => { e.currentTarget.style.backgroundColor = 'transparent'; } : undefined}
                  >
                    <Check className="w-3.5 h-3.5" /> {inp.summarizeNow}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* This Week */}
      <div className="premium-card" style={{ border: '1px solid rgba(13,26,18,.08)' }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{inp.thisWeek}</span>
          </div>
          <button onClick={() => setShowFullCalendar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: 'var(--brand-dark)', color: 'var(--brand-green)', minHeight: '36px' }}>
            <CalendarDays className="w-3.5 h-3.5" /> {inp.fullCalendar}
          </button>
        </div>
        <div className="px-4 pb-3 pt-1">
          {weekEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--success-bg)' }}>
                <Calendar className="w-6 h-6" style={{ color: 'var(--brand-green-dark)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{inp.noEventsThisWeek}</p>
              <button onClick={() => setShowAddGame(true)}
                className="premium-btn-green flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm">
                <Swords className="w-4 h-4" /> {inp.addGame}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {weekEvents.map(ev => {
                const isTraining = (() => { try { return JSON.parse(ev.notes || '{}')?.type === 'training'; } catch { return false; } })();
                const isSummarized = ev.status === 'completed';
                const d = new Date(ev.game_date);
                const dayLabel = d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: 'short' });
                const timeLabel = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{
                      backgroundColor: isSummarized ? 'var(--success-bg)' : isTraining ? 'rgba(22,163,74,.06)' : 'rgba(37,99,235,.06)',
                      border: `1px solid ${isSummarized ? 'rgba(22,163,74,.20)' : isTraining ? 'rgba(22,163,74,.18)' : 'rgba(37,99,235,.18)'}`,
                    }}>
                    {isTraining
                      ? <Dumbbell className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-green-dark)' }} />
                      : <Swords className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--info)' }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {isTraining ? inp.training : `מול ${ev.opponent}`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{dayLabel} | {timeLabel}</p>
                    </div>
                    {isSummarized && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: 'var(--success)', color: '#0D1A12' }}>
                        <Check className="w-3 h-3" /> סוכם
                      </span>
                    )}
                    {ev.location && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(13,26,18,.06)', color: 'var(--text-secondary)' }}>
                        {ev.location === 'בית' ? inp.home : inp.away}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddEventModal open={showAddTraining} onClose={() => setShowAddTraining(false)}
        teamId={teamId} defaultType="training"
        onSaved={() => { setShowAddTraining(false); onRefresh && onRefresh(); }} />
      <AddEventModal open={showAddGame} onClose={() => setShowAddGame(false)}
        teamId={teamId} defaultType="game"
        onSaved={() => { setShowAddGame(false); onRefresh && onRefresh(); }} />
      {summaryEvent && (
        <ProfessionalSummaryModal open={!!summaryEvent} onClose={() => setSummaryEvent(null)}
          event={summaryEvent}
          onSaved={() => { setSummaryEvent(null); onRefresh && onRefresh(); }} />
      )}
      <FullCalendarModal
        open={showFullCalendar}
        onClose={() => setShowFullCalendar(false)}
        teamId={teamId}
        events={allEvents || []}
        onRefresh={onRefresh}
      />
    </div>
  );
}