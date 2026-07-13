import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Target, Dumbbell, Swords, PenSquare, CheckCircle2,
  Pause, AlertCircle, Clock
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

const PRIORITY_MAP = {
  critical: { labelHe: 'קריטי',  labelEn: 'Critical',  color: '#B94040', bg: 'rgba(185,64,64,0.10)',  border: 'rgba(185,64,64,0.28)' },
  high:     { labelHe: 'גבוה',   labelEn: 'High',       color: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.28)' },
  medium:   { labelHe: 'בינוני', labelEn: 'Medium',     color: '#2A5FA8', bg: 'rgba(41,82,168,0.08)', border: 'rgba(41,82,168,0.22)' },
  low:      { labelHe: 'נמוך',   labelEn: 'Low',        color: '#9A8672', bg: 'rgba(139,115,85,0.06)', border: 'rgba(139,115,85,0.20)' },
};

const STATUS_MAP = {
  active:   { labelHe: 'פעיל',  labelEn: 'Active',   color: '#2A7050', icon: Target },
  paused:   { labelHe: 'מושהה', labelEn: 'Paused',   color: '#D97706', icon: Pause },
  resolved: { labelHe: 'נפתר',  labelEn: 'Resolved', color: '#9A8672', icon: CheckCircle2 },
};

const SOURCE_LABELS = {
  match:    { labelHe: 'משחק', labelEn: 'Match',    icon: Swords,    color: '#2A5FA8' },
  training: { labelHe: 'אימון', labelEn: 'Training', icon: Dumbbell,  color: '#2A7050' },
  manual:   { labelHe: 'ידני',  labelEn: 'Manual',   icon: PenSquare, color: '#7A2A8A' },
};

export default function WorkTopicsList({ topics, summaries, onAddTopic, onEditTopic, onRefresh, teamId: _teamId }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [filterStatus, setFilterStatus] = useState('active');

  const FILTER_OPTIONS = [
    { id: 'all',      label: isHe ? 'הכל' : 'All' },
    { id: 'active',   label: isHe ? 'פעיל' : 'Active' },
    { id: 'resolved', label: isHe ? 'נפתר' : 'Resolved' },
    { id: 'paused',   label: isHe ? 'מושהה' : 'Paused' },
  ];

  const filtered = topics.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const activeCount   = topics.filter(t => t.status === 'active').length;
  const resolvedCount = topics.filter(t => t.status === 'resolved').length;

  const handleStatusChange = async (topic, newStatus) => {
    await base44.entities.TacticalGoal.update(topic.id, { status: newStatus });
    onRefresh && onRefresh();
  };

  const getLinkedSummaryCount = (topic) => {
    const linked = topic.linked_topics || [];
    return summaries.filter(s =>
      (s.tactical_topics || []).some(t => linked.includes(t))
    ).length;
  };

  return (
    <div className="space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>
          {activeCount} {isHe ? 'פעילים' : 'active'} · {resolvedCount} {isHe ? 'נפתרו' : 'resolved'}
        </p>
        <Button onClick={onAddTopic} className="gap-1.5"
          style={{ backgroundColor: '#2A7050', color: '#fff', height: '32px', fontSize: '12px' }}>
          <Plus className="w-3.5 h-3.5" /> {isHe ? 'נושא חדש' : 'New Topic'}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filterStatus === f.id ? '#2A7050' : 'rgba(139,115,85,0.08)',
              color: filterStatus === f.id ? '#fff' : '#5C4E38',
              border: `1px solid ${filterStatus === f.id ? '#2A7050' : 'rgba(139,115,85,0.18)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Topics list */}
      {filtered.length === 0 ? (
        <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
          <CardContent className="py-10 text-center">
            <Target className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
            <p className="text-sm" style={{ color: '#9A8672' }}>
              {filterStatus === 'active'
                ? (isHe ? 'אין נושאים פעילים כרגע' : 'No active topics right now')
                : (isHe ? 'אין נושאים להצגה' : 'No topics to display')}
            </p>
            {filterStatus === 'active' && (
              <Button onClick={onAddTopic} size="sm" className="mt-3 gap-1.5"
                style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.28)' }}>
                <Plus className="w-3.5 h-3.5" /> {isHe ? 'הוסף נושא' : 'Add Topic'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(topic => {
            const pri = PRIORITY_MAP[topic.priority] || PRIORITY_MAP.medium;
            const src = SOURCE_LABELS[topic.source] || SOURCE_LABELS.manual;
            const SrcIcon = src.icon;
            const StatusIcon = STATUS_MAP[topic.status]?.icon || Target;
            const statusCol = STATUS_MAP[topic.status]?.color || '#9A8672';
            const linkedCount = getLinkedSummaryCount(topic);

            return (
              <Card key={topic.id}
                style={{ backgroundColor: '#FAF7F2', border: `1px solid ${pri.border}` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>{topic.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: pri.bg, color: pri.color, border: `1px solid ${pri.border}` }}>
                          {isHe ? pri.labelHe : pri.labelEn}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
                          style={{ backgroundColor: `${statusCol}18`, color: statusCol, border: `1px solid ${statusCol}44` }}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {isHe ? STATUS_MAP[topic.status]?.labelHe : STATUS_MAP[topic.status]?.labelEn}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ backgroundColor: `${src.color}14`, color: src.color, border: `1px solid ${src.color}33` }}>
                          <SrcIcon className="w-2.5 h-2.5" />
                          {isHe ? src.labelHe : src.labelEn}
                        </span>
                      </div>

                      {topic.description && (
                        <p className="text-xs mb-2" style={{ color: '#7A6B57' }}>{topic.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#9A8672' }}>
                        {(topic.occurrence_count > 0) && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {isHe ? `זוהה ${topic.occurrence_count}× בסיכומים` : `Detected ${topic.occurrence_count}× in summaries`}
                          </span>
                        )}
                        {linkedCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {isHe ? `${linkedCount} אימונים/משחקים קשורים` : `${linkedCount} related sessions`}
                          </span>
                        )}
                        {topic.last_seen_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isHe ? 'נראה לאחרונה: ' : 'Last seen: '}
                            {new Date(topic.last_seen_date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>

                      {topic.progress_pct >= 0 && (
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px]" style={{ color: '#9A8672' }}>{isHe ? 'התקדמות' : 'Progress'}</span>
                            <span className="text-[10px] font-semibold" style={{ color: pri.color }}>{topic.progress_pct || 0}%</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(139,115,85,0.14)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${topic.progress_pct || 0}%`, backgroundColor: pri.color }} />
                          </div>
                          {topic.progress_note && (
                            <p className="text-[10px] mt-1" style={{ color: '#9A8672' }}>{topic.progress_note}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Button size="sm" onClick={() => onEditTopic(topic)}
                        className="h-7 px-2.5 text-xs gap-1"
                        style={{ backgroundColor: 'rgba(42,112,80,0.10)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.28)' }}>
                        <PenSquare className="w-3 h-3" /> {isHe ? 'עדכן' : 'Edit'}
                      </Button>
                      {topic.status === 'active' && (
                        <Button size="sm" onClick={() => handleStatusChange(topic, 'resolved')}
                          className="h-7 px-2.5 text-xs gap-1"
                          style={{ backgroundColor: 'rgba(139,115,85,0.08)', color: '#7A6B57', border: '1px solid rgba(139,115,85,0.22)' }}>
                          <CheckCircle2 className="w-3 h-3" /> {isHe ? 'סגור' : 'Resolve'}
                        </Button>
                      )}
                      {topic.status === 'resolved' && (
                        <Button size="sm" onClick={() => handleStatusChange(topic, 'active')}
                          className="h-7 px-2.5 text-xs gap-1"
                          style={{ backgroundColor: 'rgba(217,119,6,0.10)', color: '#D97706', border: '1px solid rgba(217,119,6,0.28)' }}>
                          <Target className="w-3 h-3" /> {isHe ? 'פתח מחדש' : 'Reopen'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}