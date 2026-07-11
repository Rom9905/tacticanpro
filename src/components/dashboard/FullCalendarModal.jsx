import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, X, Dumbbell, Swords, RefreshCw,
  CheckCircle2, AlertCircle, Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProfessionalSummaryModal from '@/components/calendar/ProfessionalSummaryModal';
import AddEventModal from '@/components/calendar/AddEventModal';
import { useLang } from '@/lib/LanguageContext';

const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseNotes(notes) {
  try { return JSON.parse(notes || '{}'); } catch { return {}; }
}
function isEventPast(ev) { return new Date(ev.game_date) < new Date(); }
function getEventStatus(ev) {
  if (ev.status === 'completed') return 'summarized';
  if (isEventPast(ev)) return 'needs_summary';
  return 'upcoming';
}

export default function FullCalendarModal({ open, onClose, teamId, events = [], onRefresh }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [summaryEvent, setSummaryEvent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [addType, setAddType] = useState(null);

  const MONTH_NAMES = isHe ? MONTH_NAMES_HE : MONTH_NAMES_EN;
  const DAY_NAMES = isHe ? DAY_NAMES_HE : DAY_NAMES_EN;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const eventsByDate = {};
  events.forEach(e => {
    const d = new Date(e.game_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!eventsByDate[key]) eventsByDate[key] = [];
    const parsed = parseNotes(e.notes);
    eventsByDate[key].push({ ...e, parsedNotes: parsed, isTraining: parsed?.type === 'training' });
  });

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selectedKey = selectedDay ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}` : null;
  const selectedDayEvents = selectedKey ? (eventsByDate[selectedKey] || []) : [];

  const handleSync = async () => {
    setSyncing(true); setSyncDone(false); setSyncError(null);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', { teamId });
      if (res.data?.ok) { setSyncDone(true); onRefresh && onRefresh(); }
      else setSyncError(res.data?.error || (isHe ? 'שגיאה בסנכרון' : 'Sync error'));
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const locale = isHe ? 'he-IL' : 'en-US';

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
          style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <DialogHeader className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(139,115,85,0.18)' }}>
            <div className="flex items-center justify-between">
              <DialogTitle style={{ color: '#2C2416' }}>{isHe ? 'לוח שנה' : 'Calendar'}</DialogTitle>
              <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#9A8672' }} /></button>
            </div>

            <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(139,115,85,0.10)' }}>
                {['month', 'week'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: viewMode === m ? '#2A7050' : 'transparent',
                      color: viewMode === m ? '#fff' : '#5C4E38',
                    }}>
                    {m === 'month' ? (isHe ? 'חודש' : 'Month') : (isHe ? 'שבוע' : 'Week')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {syncDone && (
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#2A7050' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isHe ? 'סונכרן!' : 'Synced!'}
                  </div>
                )}
                {syncError && (
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#B94040' }}>
                    <AlertCircle className="w-3.5 h-3.5" /> {syncError}
                  </div>
                )}
                <Button size="sm" onClick={handleSync} disabled={syncing}
                  className="gap-1.5 h-8"
                  style={{ backgroundColor: '#4285F4', color: '#fff', fontSize: '12px' }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? (isHe ? 'מסנכרן...' : 'Syncing...') : 'Google Calendar'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4">
            {viewMode === 'month' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-black/5">
                    <ChevronRight className="w-4 h-4" style={{ color: '#7A6B57' }} />
                  </button>
                  <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-black/5">
                    <ChevronLeft className="w-4 h-4" style={{ color: '#7A6B57' }} />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: '#9A8672' }}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} className="min-h-[50px]" />;
                    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                    const isToday = key === todayKey;
                    const isSelected = selectedKey === key;
                    const dayEvs = eventsByDate[key] || [];
                    const hasSummary = dayEvs.some(e => getEventStatus(e) === 'needs_summary');
                    return (
                      <button key={key}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className="min-h-[50px] rounded-lg p-1 flex flex-col items-center gap-0.5 transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(42,112,80,0.18)' : isToday ? 'rgba(42,112,80,0.10)' : 'rgba(139,115,85,0.04)',
                          border: isSelected ? '1.5px solid rgba(42,112,80,0.50)' : isToday ? '1.5px solid rgba(42,112,80,0.30)' : '1px solid rgba(139,115,85,0.10)',
                        }}>
                        <span className="text-[11px] font-semibold" style={{ color: isToday ? '#2A7050' : '#5C4E38' }}>
                          {day.getDate()}
                        </span>
                        <div className="flex gap-0.5 flex-wrap justify-center">
                          {hasSummary && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#B94040' }} />}
                          {dayEvs.some(e => e.isTraining && !hasSummary) && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2A7050' }} />}
                          {dayEvs.some(e => !e.isTraining) && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2A5FA8' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedDay && selectedDayEvents.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl space-y-2"
                    style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px solid rgba(139,115,85,0.18)' }}>
                    <p className="text-xs font-semibold" style={{ color: '#5C4E38' }}>
                      {selectedDay.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {selectedDayEvents.map(ev => {
                      const status = getEventStatus(ev);
                      const d = new Date(ev.game_date);
                      return (
                        <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg"
                          style={{
                            backgroundColor: ev.isTraining ? 'rgba(42,112,80,0.08)' : 'rgba(41,82,168,0.08)',
                            border: `1px solid ${ev.isTraining ? 'rgba(42,112,80,0.22)' : 'rgba(41,82,168,0.22)'}`,
                          }}>
                          <div className="flex items-center gap-2">
                            {ev.isTraining
                              ? <Dumbbell className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />
                              : <Swords className="w-3.5 h-3.5" style={{ color: '#2A5FA8' }} />}
                            <div>
                              <p className="text-xs font-semibold" style={{ color: '#2C2416' }}>
                                {ev.isTraining ? (isHe ? 'אימון' : 'Training') : `${isHe ? 'מול' : 'vs'} ${ev.opponent}`}
                              </p>
                              <p className="text-xs" style={{ color: '#9A8672' }}>
                                {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          {status === 'needs_summary' && (
                            <Button size="sm" onClick={() => { setSummaryEvent(ev); setSelectedDay(null); }}
                              className="gap-1.5 h-7"
                              style={{ backgroundColor: '#B97A2A', color: '#fff', fontSize: '11px' }}>
                              <Calendar className="w-3 h-3" /> {isHe ? 'סכם עכשיו' : 'Summarize'}
                            </Button>
                          )}
                          {status === 'summarized' && (
                            <CheckCircle2 className="w-4 h-4" style={{ color: '#2A7050' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {viewMode === 'week' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold mb-3" style={{ color: '#9A8672' }}>
                  {isHe ? 'שבוע נוכחי: ' : 'Current week: '}
                  {weekDays[0].toLocaleDateString(locale, { day: '2-digit', month: 'short' })} — {weekDays[6].toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                </p>
                {weekDays.map((day, i) => {
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                  const isToday = key === todayKey;
                  const dayEvs = eventsByDate[key] || [];
                  return (
                    <div key={i} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${isToday ? 'rgba(42,112,80,0.35)' : 'rgba(139,115,85,0.15)'}` }}>
                      <div className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: isToday ? 'rgba(42,112,80,0.10)' : 'rgba(139,115,85,0.04)' }}>
                        <span className="text-xs font-semibold" style={{ color: isToday ? '#2A7050' : '#5C4E38' }}>
                          {day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        {dayEvs.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050' }}>
                            {dayEvs.length} {isHe ? 'אירועים' : 'events'}
                          </span>
                        )}
                      </div>
                      {dayEvs.length === 0 ? (
                        <div className="px-3 py-2 text-xs" style={{ color: '#C8BFB3' }}>
                          {isHe ? 'אין אירועים' : 'No events'}
                        </div>
                      ) : (
                        <div className="px-3 py-2 space-y-1.5">
                          {dayEvs.map(ev => {
                            const status = getEventStatus(ev);
                            const d = new Date(ev.game_date);
                            return (
                              <div key={ev.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {ev.isTraining
                                    ? <Dumbbell className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />
                                    : <Swords className="w-3.5 h-3.5" style={{ color: '#2A5FA8' }} />}
                                  <span className="text-xs font-medium" style={{ color: '#2C2416' }}>
                                    {ev.isTraining ? (isHe ? 'אימון' : 'Training') : `${isHe ? 'מול' : 'vs'} ${ev.opponent}`}
                                  </span>
                                  <span className="text-xs" style={{ color: '#9A8672' }}>
                                    {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {status === 'needs_summary' && (
                                  <Button size="sm" onClick={() => setSummaryEvent(ev)}
                                    className="gap-1 h-6"
                                    style={{ backgroundColor: '#B97A2A', color: '#fff', fontSize: '10px' }}>
                                    <Calendar className="w-2.5 h-2.5" /> {isHe ? 'סכם' : 'Summarize'}
                                  </Button>
                                )}
                                {status === 'summarized' && (
                                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 flex-wrap" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#2A7050' }} />
                <span className="text-xs" style={{ color: '#9A8672' }}>{isHe ? 'אימון' : 'Training'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#2A5FA8' }} />
                <span className="text-xs" style={{ color: '#9A8672' }}>{isHe ? 'משחק' : 'Match'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#B94040' }} />
                <span className="text-xs" style={{ color: '#9A8672' }}>{isHe ? 'ממתין לסיכום' : 'Awaiting Summary'}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {summaryEvent && (
        <ProfessionalSummaryModal
          open={!!summaryEvent} onClose={() => setSummaryEvent(null)}
          event={summaryEvent} onSaved={() => { setSummaryEvent(null); onRefresh && onRefresh(); }}
        />
      )}
      {addType && (
        <AddEventModal
          open={!!addType} onClose={() => setAddType(null)}
          teamId={teamId} defaultType={addType}
          onSaved={() => { setAddType(null); onRefresh && onRefresh(); }}
        />
      )}
    </>
  );
}