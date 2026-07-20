import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import {
  Calendar, Dumbbell, Swords,
  CalendarDays, Check, ChevronLeft
} from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import ProfessionalSummaryModal from '@/components/calendar/ProfessionalSummaryModal';
import FullCalendarModal from '@/components/dashboard/FullCalendarModal';

// ── helpers ──────────────────────────────────────────────────────────────
const eventType = (ev) => {
  if (ev?.parsedNotes?.type) return ev.parsedNotes.type;
  try { return JSON.parse(ev?.notes || '{}')?.type || 'game'; } catch { return 'game'; }
};
const isSummarized = (ev) => ev?.status === 'completed';
const isoWeek = (d) => {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - oneJan) / 86400000);
  return Math.ceil((days + oneJan.getDay() + 1) / 7);
};
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function InputTab({ teamId, allEvents, needsSummaryEvents, onRefresh }) {
  const { t } = useLang();
  const inp = t.input;
  const isHe = t.lang === 'he';

  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const now = new Date();
  const events = allEvents || [];
  const pending = needsSummaryEvents || [];

  // Recently completed summaries (last 21 days) — drives the progress ring.
  const recentCompleted = events.filter(ev => {
    if (!isSummarized(ev)) return false;
    const d = new Date(ev.game_date);
    return (now - d) >= 0 && (now - d) <= 21 * 86400000;
  });

  const doneCount = recentCompleted.length;
  const pendingCount = pending.length;
  const total = doneCount + pendingCount;
  const progress = total > 0 ? doneCount / total : 0;

  // Progress ring geometry (README: viewBox 72, r=30, stroke 7, dash 188.5).
  const DASH = 188.5;
  const ringOffset = DASH * (1 - progress);

  // ── Current week (Sun–Sat) for the week strip ──
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayEvents = events.filter(ev => sameDay(new Date(ev.game_date), date));
    const game = dayEvents.find(ev => eventType(ev) === 'game');
    const training = dayEvents.find(ev => eventType(ev) === 'training');
    const primary = game || training || null;
    const needsSummary = dayEvents.some(ev => pending.some(p => p.id === ev.id));
    return {
      date,
      isToday: sameDay(date, now),
      kind: game ? 'game' : training ? 'training' : 'empty',
      location: game?.location || null,
      needsSummary,
      hasEvent: !!primary,
    };
  });

  const quickActions = [
    {
      id: 'game', icon: Swords,
      label: inp.addGame,
      desc: isHe ? 'קבע משחק חדש ביומן — בית או חוץ' : 'Schedule a new match — home or away',
      color: '#2A7050', bg: 'rgba(42,112,80,0.10)', border: 'rgba(42,112,80,0.30)',
      shadow: 'rgba(42,112,80,.22)', onClick: () => setShowAddGame(true),
    },
    {
      id: 'training', icon: Dumbbell,
      label: inp.addTraining,
      desc: isHe ? 'הוסף אימון לשבוע הקרוב' : 'Add a training session to the week',
      color: '#B97A2A', bg: 'rgba(185,122,42,0.10)', border: 'rgba(185,122,42,0.30)',
      shadow: 'rgba(185,122,42,.22)', onClick: () => setShowAddTraining(true),
    },
  ];

  return (
    <div className="space-y-4 pb-20 md:pb-0" dir="rtl">
      {/* ═══ HERO — מרכז ההזנה ═══ */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(160deg,#0D1A12 0%,#14301F 100%)', padding: '24px 24px 60px' }}>
        {/* Pitch lines */}
        <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.14, pointerEvents: 'none' }}>
          <g fill="none" stroke="#4ADE80" strokeWidth="2">
            <rect x="8" y="8" width="284" height="184" rx="2" />
            <line x1="150" y1="8" x2="150" y2="192" />
            <circle cx="150" cy="100" r="30" />
            <rect x="8" y="60" width="46" height="80" />
            <rect x="246" y="60" width="46" height="80" />
          </g>
        </svg>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4ADE80', letterSpacing: '0.06em' }}>
              {isHe ? `שבוע ${isoWeek(now)}` : `Week ${isoWeek(now)}`}
            </div>
            <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 24, color: '#F4EFE6', margin: '2px 0 0' }}>
              {isHe ? 'מרכז ההזנה' : 'Input Center'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(244,239,230,0.6)', marginTop: 4 }}>
              {isHe ? 'הוסף אירועים וסכם את מה שקרה על המגרש' : 'Add events and summarize what happened on the pitch'}
            </p>
          </div>

          {/* Progress ring (desktop) */}
          <div className="hidden md:block" style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(74,222,128,0.15)" strokeWidth="7" />
              <motion.circle
                cx="36" cy="36" r="30" fill="none" stroke="#4ADE80" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={DASH}
                initial={{ strokeDashoffset: DASH }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 17, color: '#F4EFE6', lineHeight: 1 }}>{doneCount}/{total}</span>
              <span style={{ fontSize: 9, color: 'rgba(244,239,230,0.55)' }}>{isHe ? 'סוכמו' : 'done'}</span>
            </div>
          </div>
        </div>

        {/* Progress bar (mobile) */}
        <div className="md:hidden" style={{ position: 'relative', marginTop: 16 }}>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(74,222,128,0.15)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: '#4ADE80', borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#4ADE80', marginTop: 6 }}>{doneCount}/{total} {isHe ? 'סוכמו' : 'done'}</div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS (overlap hero) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: -40, position: 'relative', padding: '0 4px' }}>
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: 'easeOut' }}
              whileTap={{ scale: 0.98 }}
              onClick={a.onClick}
              className="group flex items-center gap-4 text-right cursor-pointer focus-visible:outline-none"
              style={{ background: '#FFFFFF', borderRadius: 16, borderTop: `3px solid ${a.color}`, padding: 16, minHeight: 84, boxShadow: '0 8px 20px rgba(13,26,18,.1)', transition: 'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${a.shadow}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(13,26,18,.1)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: a.bg, border: `1px solid ${a.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon className="w-[22px] h-[22px]" style={{ color: a.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 15, color: '#2C2416' }}>{a.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#9A8672', marginTop: 2 }}>{a.desc}</span>
              </div>
              <ChevronLeft className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-1" style={{ color: a.color }} aria-hidden="true" />
            </motion.button>
          );
        })}
      </div>

      {/* ═══ TASKS CHECKLIST — המשימות שלך ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: 'easeOut' }}
        style={{ background: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)', borderRadius: 16, padding: 16 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2.5">
            <span className={pendingCount > 0 ? 'animate-pulse' : ''} style={{ width: 8, height: 8, borderRadius: 999, background: pendingCount > 0 ? '#D97706' : '#2A7050', display: 'inline-block' }} />
            <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 14, color: '#2C2416' }}>{isHe ? 'המשימות שלך' : 'Your tasks'}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
            {pendingCount} {isHe ? 'ממתינים' : 'pending'}
          </span>
        </div>

        <div className="space-y-2">
          {/* Pending rows */}
          {pending.map((ev) => {
            const training = eventType(ev) === 'training';
            const d = new Date(ev.game_date);
            const dateLabel = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
            if (training) {
              return (
                <div key={ev.id} className="flex items-center justify-between gap-3" style={{ background: '#FFFFFF', border: '1.5px solid rgba(217,119,6,0.35)', borderRadius: 14, padding: '12px 14px' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid #D97706', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#2C2416' }}>{isHe ? 'אימון' : 'Training'} {dateLabel}</p>
                      <p style={{ fontSize: 11, color: '#9A8672', marginTop: 1 }}>{inp.awaitingSummary}</p>
                    </div>
                  </div>
                  <button onClick={() => setSummaryEvent(ev)}
                    style={{ fontSize: 12, fontWeight: 700, color: '#D97706', border: '1.5px solid #D97706', background: 'transparent', borderRadius: 10, padding: '8px 14px', minHeight: 40, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,119,6,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    {isHe ? 'סכם' : 'Summarize'}
                  </button>
                </div>
              );
            }
            // Pending match — dark scoreboard
            return (
              <div key={ev.id} className="flex items-center justify-between gap-3" style={{ background: '#0D1A12', borderRadius: 16, padding: '14px 16px' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 20, color: '#F4EFE6', lineHeight: 1 }}>? : ?</div>
                    <div style={{ fontSize: 9, color: 'rgba(244,239,230,0.55)', marginTop: 2 }}>{isHe ? 'תוצאה?' : 'Result?'}</div>
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE6' }}>{isHe ? `מול ${ev.opponent}` : `vs ${ev.opponent}`}</p>
                    <p style={{ fontSize: 11, color: 'rgba(244,239,230,0.55)', marginTop: 1 }}>
                      {dateLabel}{ev.location ? ` · ${ev.location === 'בית' ? inp.home : inp.away}` : ''} · {isHe ? 'לוקח כ-2 דקות' : '~2 min'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSummaryEvent(ev)}
                  style={{ fontFamily: 'Heebo,sans-serif', fontSize: 12, fontWeight: 800, color: '#0D1A12', background: '#4ADE80', borderRadius: 10, padding: '0 14px', minHeight: 40, border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'filter .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
                  {inp.summarizeNow}
                </button>
              </div>
            );
          })}

          {/* Completed rows */}
          {recentCompleted.map(ev => {
            const training = eventType(ev) === 'training';
            const d = new Date(ev.game_date);
            const label = training
              ? `${isHe ? 'אימון' : 'Training'} ${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`
              : (isHe ? `מול ${ev.opponent}` : `vs ${ev.opponent}`);
            return (
              <div key={ev.id} className="flex items-center justify-between gap-3" style={{ background: 'rgba(42,112,80,0.06)', border: '1.5px solid rgba(42,112,80,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: '#2A7050', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check className="w-3 h-3" style={{ color: '#FFFFFF' }} />
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#2A7050', textDecoration: 'line-through' }}>{label}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2A7050', flexShrink: 0 }}>✓ {isHe ? 'נכנס לניתוח' : 'Analyzed'}</span>
              </div>
            );
          })}

          {/* All done / empty */}
          {total > 0 && pendingCount === 0 && (
            <div style={{ background: 'rgba(74,222,128,0.1)', border: '1.5px dashed rgba(42,112,80,0.35)', borderRadius: 14, padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#2A7050' }}>
              🎉 {isHe ? 'כל הסיכומים הושלמו — השבוע שלך מלא!' : 'All summaries done — your week is complete!'}
            </div>
          )}
          {total === 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(139,115,85,0.14)', borderRadius: 14, padding: '16px', textAlign: 'center', fontSize: 13, color: '#9A8672' }}>
              {isHe ? 'אין משימות ממתינות — הוסף אירוע כדי להתחיל' : 'No pending tasks — add an event to start'}
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ WEEK STRIP — השבוע על המגרש ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15, ease: 'easeOut' }}
        style={{ background: '#FFFFFF', border: '1px solid rgba(139,115,85,0.18)', borderRadius: 16, padding: 16 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(42,112,80,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar className="w-4 h-4" style={{ color: '#2A7050' }} />
            </div>
            <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 14, color: '#2C2416' }}>{isHe ? 'השבוע על המגרש' : 'This week on the pitch'}</span>
          </div>
          <button onClick={() => setShowFullCalendar(true)}
            className="flex items-center gap-1.5"
            style={{ background: '#0D1A12', color: '#4ADE80', fontSize: 12, fontWeight: 700, borderRadius: 10, padding: '8px 12px', minHeight: 40, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16301F'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0D1A12'; }}>
            <CalendarDays className="w-3.5 h-3.5" /> {inp.fullCalendar}
          </button>
        </div>

        {/* Day cards */}
        <div className="tc-hide-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {weekDays.map((day, i) => {
            const weekday = day.date.toLocaleDateString('he-IL', { weekday: 'short' });
            const dayNum = day.date.getDate();
            let cardStyle, numColor, badge = null;
            if (day.kind === 'game') {
              cardStyle = { background: '#0D1A12', border: '1px solid rgba(74,222,128,0.3)' };
              numColor = '#4ADE80';
              badge = { text: day.location === 'חוץ' ? (isHe ? 'משחק חוץ' : 'Away') : (isHe ? 'משחק בית' : 'Home'), bg: '#4ADE80', color: '#0D1A12' };
            } else if (day.kind === 'training') {
              cardStyle = { background: '#FFFFFF', border: '1px solid rgba(185,122,42,0.30)' };
              numColor = '#B97A2A';
              badge = { text: isHe ? 'אימון' : 'Training', bg: 'rgba(185,122,42,0.14)', color: '#B97A2A' };
            } else if (day.isToday) {
              cardStyle = { background: '#FFFFFF', border: '1.5px solid rgba(42,112,80,0.4)' };
              numColor = '#2A7050';
              badge = { text: isHe ? 'היום' : 'Today', bg: 'rgba(42,112,80,0.12)', color: '#2A7050' };
            } else {
              cardStyle = { background: 'rgba(139,115,85,0.04)', border: '1px solid rgba(139,115,85,0.10)' };
              numColor = '#9A8672';
            }
            return (
              <div key={i} style={{ ...cardStyle, borderRadius: 14, padding: '10px 8px', minWidth: 64, flexShrink: 0, textAlign: 'center', position: 'relative' }}>
                {day.needsSummary && (
                  <span style={{ position: 'absolute', top: 6, insetInlineEnd: 6, width: 6, height: 6, borderRadius: 999, background: '#B94040' }} />
                )}
                <div style={{ fontSize: 10, color: day.kind === 'game' ? 'rgba(244,239,230,0.6)' : '#5C4E38' }}>{weekday}</div>
                <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 18, color: numColor, margin: '2px 0 4px' }}>{day.hasEvent || day.isToday ? dayNum : '—'}</div>
                {badge && (
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.text}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(139,115,85,0.12)' }}>
          {[
            { c: '#4ADE80', l: isHe ? 'משחק' : 'Game' },
            { c: '#B97A2A', l: isHe ? 'אימון' : 'Training' },
            { c: '#B94040', l: isHe ? 'ממתין לסיכום' : 'Awaiting summary' },
          ].map(x => (
            <span key={x.l} className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#7A6B57' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: x.c }} /> {x.l}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ═══ Modals ═══ */}
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
