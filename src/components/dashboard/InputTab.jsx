import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import {
  Clock, Calendar, Dumbbell, Swords,
  CalendarDays, Check, PlusCircle, ChevronLeft, MapPin
} from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import ProfessionalSummaryModal from '@/components/calendar/ProfessionalSummaryModal';
import FullCalendarModal from '@/components/dashboard/FullCalendarModal';

export default function InputTab({ teamId, allEvents, needsSummaryEvents, onRefresh }) {
  const { t } = useLang();
  const inp = t.input;
  const isHe = t.lang === 'he';

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

  const quickActions = [
    {
      id: 'game', icon: Swords, primary: true,
      label: inp.addGame,
      desc: isHe ? 'קבע משחק חדש ביומן — בית או חוץ' : 'Schedule a new match — home or away',
      color: '#2A7050', bg: 'rgba(42,112,80,0.10)', border: 'rgba(42,112,80,0.30)',
      onClick: () => setShowAddGame(true),
    },
    {
      id: 'training', icon: Dumbbell, primary: false,
      label: inp.addTraining,
      desc: isHe ? 'הוסף אימון לשבוע הקרוב' : 'Add a training session to the week',
      color: '#B97A2A', bg: 'rgba(185,122,42,0.10)', border: 'rgba(185,122,42,0.30)',
      onClick: () => setShowAddTraining(true),
    },
  ];

  return (
    <div className="space-y-4 pb-20 md:pb-0" dir="rtl">
      {/* ── Header + quick actions ── */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
        <div className="px-5 pt-5 pb-4 md:px-6" style={{ background: 'linear-gradient(135deg, #0D1A12 0%, #12251A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <PlusCircle className="w-5 h-5" style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#F4EFE6', fontFamily: 'Heebo, sans-serif' }}>
                {isHe ? 'הזנה' : 'Input'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(244,239,230,0.55)' }}>
                {isHe ? 'הוסף אירועים וסכם את מה שקרה' : 'Add events and summarize what happened'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 md:p-5">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05, ease: 'easeOut' }}
                whileTap={{ scale: 0.98 }}
                onClick={a.onClick}
                className="group relative flex items-center gap-4 p-4 rounded-xl text-right transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid rgba(139,115,85,0.14)',
                  boxShadow: '0 1px 2px rgba(13,26,18,0.04)',
                  minHeight: '84px',
                  '--tw-ring-color': a.color,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = a.border;
                  e.currentTarget.style.boxShadow = `0 6px 18px -6px ${a.bg.replace('0.10', '0.45')}`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(139,115,85,0.14)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(13,26,18,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span className="absolute top-3 bottom-3 right-0 w-1 rounded-l-full transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: a.color }} aria-hidden="true" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: a.bg, border: `1px solid ${a.border}` }}>
                  <Icon className="w-6 h-6" style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold" style={{ color: '#2C2416', fontFamily: 'Heebo, sans-serif' }}>{a.label}</span>
                  <span className="block text-xs mt-1 leading-relaxed" style={{ color: '#9A8672' }}>{a.desc}</span>
                </div>
                <ChevronLeft className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
                  style={{ color: a.color }} aria-hidden="true" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Pending Summaries ── */}
      {needsSummaryEvents?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: 'easeOut' }}
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(139,115,85,0.18)', borderRight: '4px solid #D97706' }}
        >
          <div className="px-4 pt-4 pb-2 md:px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(217,119,6,0.10)' }}>
                <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
              </div>
              <span className="text-sm font-bold" style={{ color: '#2C2416' }}>{inp.pendingSummaries}</span>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
              style={{ backgroundColor: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
              {needsSummaryEvents.length}
            </span>
          </div>
          <div className="px-4 pb-4 md:px-5 space-y-2 pt-1">
            {needsSummaryEvents.map((ev, idx) => {
              const isTraining = ev.parsedNotes?.type === 'training';
              const d = new Date(ev.game_date);
              const isTop = idx === 0;
              return (
                <div key={ev.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl transition-colors duration-200"
                  style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.12)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isTraining ? 'rgba(185,122,42,0.10)' : 'rgba(42,112,80,0.10)' }}>
                      {isTraining
                        ? <Dumbbell className="w-4 h-4" style={{ color: '#B97A2A' }} />
                        : <Swords className="w-4 h-4" style={{ color: '#2A7050' }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: '#2C2416' }}>
                        {isTraining ? inp.training : `מול ${ev.opponent}`}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9A8672' }}>
                        {d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: '2-digit' })} · {inp.awaitingSummary}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSummaryEvent(ev)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold flex-shrink-0 transition-all duration-200 cursor-pointer"
                    style={isTop
                      ? { backgroundColor: '#2A7050', color: '#FFFFFF', minHeight: '40px', boxShadow: '0 2px 8px rgba(42,112,80,0.25)' }
                      : { color: '#2A7050', border: '1.5px solid rgba(42,112,80,0.30)', backgroundColor: 'transparent', minHeight: '40px' }}
                    onMouseEnter={e => {
                      if (isTop) e.currentTarget.style.backgroundColor = '#235E43';
                      else e.currentTarget.style.backgroundColor = 'rgba(42,112,80,0.08)';
                    }}
                    onMouseLeave={e => {
                      if (isTop) e.currentTarget.style.backgroundColor = '#2A7050';
                      else e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Check className="w-3.5 h-3.5" /> {inp.summarizeNow}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── This Week ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15, ease: 'easeOut' }}
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(139,115,85,0.18)' }}
      >
        <div className="px-4 pt-4 pb-2 md:px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(42,112,80,0.10)' }}>
              <Calendar className="w-4 h-4" style={{ color: '#2A7050' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#2C2416' }}>{inp.thisWeek}</span>
          </div>
          <button onClick={() => setShowFullCalendar(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: '#0D1A12', color: '#4ADE80', minHeight: '40px' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#16301F'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D1A12'; }}
          >
            <CalendarDays className="w-3.5 h-3.5" /> {inp.fullCalendar}
          </button>
        </div>
        <div className="px-4 pb-4 md:px-5 pt-1">
          {weekEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(42,112,80,0.08)', border: '1px dashed rgba(42,112,80,0.30)' }}>
                <Calendar className="w-6 h-6" style={{ color: '#2A7050' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#9A8672' }}>{inp.noEventsThisWeek}</p>
              <button onClick={() => setShowAddGame(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: '#2A7050', color: '#FFFFFF', minHeight: '44px', boxShadow: '0 2px 8px rgba(42,112,80,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#235E43'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2A7050'; }}
              >
                <Swords className="w-4 h-4" /> {inp.addGame}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {weekEvents.map(ev => {
                const isTraining = (() => { try { return JSON.parse(ev.notes || '{}')?.type === 'training'; } catch { return false; } })();
                const isSummarized = ev.status === 'completed';
                const d = new Date(ev.game_date);
                const dayNum = d.toLocaleDateString('he-IL', { day: '2-digit' });
                const weekday = d.toLocaleDateString('he-IL', { weekday: 'short' });
                const timeLabel = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                const accent = isTraining ? '#B97A2A' : '#2A7050';
                const accentBg = isTraining ? 'rgba(185,122,42,0.10)' : 'rgba(42,112,80,0.10)';
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200"
                    style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.12)' }}>
                    {/* Date block */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: accentBg, border: `1px solid ${accent}30` }}>
                      <span className="text-sm font-bold leading-none" style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>{dayNum}</span>
                      <span className="text-[10px] mt-0.5" style={{ color: accent }}>{weekday}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isTraining
                          ? <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
                          : <Swords className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />}
                        <p className="text-xs font-bold truncate" style={{ color: '#2C2416' }}>
                          {isTraining ? inp.training : `מול ${ev.opponent}`}
                        </p>
                      </div>
                      <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#9A8672' }}>
                        <Clock className="w-3 h-3" /> {timeLabel}
                        {ev.location && (
                          <span className="flex items-center gap-0.5">
                            · <MapPin className="w-3 h-3" /> {ev.location === 'בית' ? inp.home : inp.away}
                          </span>
                        )}
                      </p>
                    </div>
                    {isSummarized && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0"
                        style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050' }}>
                        <Check className="w-3 h-3" /> {isHe ? 'סוכם' : 'Done'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

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
