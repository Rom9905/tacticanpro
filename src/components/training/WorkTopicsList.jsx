import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dumbbell, Swords, PenSquare, AlertCircle, Clock, Target,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

// Priority palette — "Premium Match-Day" tokens (README §4).
const PRIORITY_MAP = {
  critical: { labelHe: 'קריטי',  labelEn: 'Critical', color: '#DC2626', bg: '#FCEBEB', grad: 'linear-gradient(90deg,#DC2626,#F87171)' },
  high:     { labelHe: 'גבוה',   labelEn: 'High',     color: '#D97706', bg: '#FDF3E3', grad: 'linear-gradient(90deg,#D97706,#FBBF24)' },
  medium:   { labelHe: 'בינוני', labelEn: 'Medium',   color: '#2563EB', bg: '#EAF1FD', grad: 'linear-gradient(90deg,#2563EB,#60A5FA)' },
  low:      { labelHe: 'נמוך',   labelEn: 'Low',      color: '#94A39A', bg: 'rgba(148,163,154,.12)', grad: 'linear-gradient(90deg,#94A39A,#C8BFB3)' },
};

const SOURCE_LABELS = {
  match:    { labelHe: 'משחק', labelEn: 'Match',    icon: Swords },
  training: { labelHe: 'אימון', labelEn: 'Training', icon: Dumbbell },
  manual:   { labelHe: 'ידני',  labelEn: 'Manual',   icon: PenSquare },
};

const CARD_SHADOW = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

export default function WorkTopicsList({ topics, summaries, onAddTopic, onEditTopic, onRefresh, teamId: _teamId }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [filterStatus, setFilterStatus] = useState('active');

  const FILTER_OPTIONS = [
    { id: 'active',   label: isHe ? 'פעילים' : 'Active' },
    { id: 'resolved', label: isHe ? 'שנסגרו' : 'Resolved' },
    { id: 'all',      label: isHe ? 'הכל' : 'All' },
  ];

  const filtered = topics.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const activeList = filtered.filter(t => t.status !== 'resolved');
  const resolvedList = filtered.filter(t => t.status === 'resolved');

  const handleStatusChange = async (topic, newStatus) => {
    await base44.entities.TacticalGoal.update(topic.id, { status: newStatus });
    onRefresh && onRefresh();
  };

  const getLinkedSummaryCount = (topic) => {
    const linked = topic.linked_topics || [];
    return summaries.filter(s => (s.tactical_topics || []).some(t => linked.includes(t))).length;
  };

  const dateStr = (topic) => {
    const d = topic.last_seen_date || topic.created_date;
    return d ? new Date(d).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long' }) : '';
  };

  return (
    <div dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header row (§3) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 4px' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#14231A' }}>{isHe ? 'נושאי עבודה' : 'Work Topics'}</div>
          <div style={{ fontSize: 12, color: '#5C6B61', marginTop: 2 }}>
            {isHe ? 'הבעיות והמטרות הטקטיות שהקבוצה עובדת עליהן — מסודרות לפי דחיפות.' : 'The tactical issues and goals the team is working on — ordered by urgency.'}
          </div>
        </div>
        <button onClick={onAddTopic}
          style={{ background: '#0D1A12', color: '#4ADE80', fontSize: 12, fontWeight: 700, padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          + {isHe ? 'נושא חדש' : 'New Topic'}
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 4px 0' }}>
        {FILTER_OPTIONS.map(f => {
          const on = filterStatus === f.id;
          return (
            <button key={f.id} onClick={() => setFilterStatus(f.id)}
              style={{
                fontSize: 11, fontWeight: on ? 700 : 600, padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: on ? '#0D1A12' : '#fff', color: on ? '#4ADE80' : '#5C6B61',
                boxShadow: on ? 'none' : '0 1px 2px rgba(13,26,18,.06)',
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Active/paused topic cards */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        {activeList.map(topic => {
          const pri = PRIORITY_MAP[topic.priority] || PRIORITY_MAP.medium;
          const src = SOURCE_LABELS[topic.source] || SOURCE_LABELS.manual;
          const SrcIcon = src.icon;
          const linkedCount = getLinkedSummaryCount(topic);
          const pct = Math.max(0, Math.min(100, topic.progress_pct || 0));
          return (
            <div key={topic.id} className="premium-card-clickable" style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: CARD_SHADOW, borderTop: `3px solid ${pri.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px', color: pri.color, background: pri.bg, padding: '3px 10px', borderRadius: 99 }}>
                  {isHe ? pri.labelHe : pri.labelEn}
                </span>
                <span style={{ fontSize: 10, color: '#94A39A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <SrcIcon className="w-2.5 h-2.5" />
                  {isHe ? 'מקור' : 'Source'}: {isHe ? src.labelHe : src.labelEn}{dateStr(topic) ? ` · ${dateStr(topic)}` : ''}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: 15, color: '#14231A', marginTop: 10 }}>{topic.title}</div>
              {topic.description && <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#5C6B61' }}>{topic.description}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#9A8672', marginBottom: topic.description ? 0 : 12 }}>
                {topic.occurrence_count > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle className="w-3 h-3" />{isHe ? `זוהה ${topic.occurrence_count}× בסיכומים` : `Detected ${topic.occurrence_count}×`}
                  </span>
                )}
                {linkedCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Dumbbell className="w-3 h-3" />{linkedCount} {isHe ? 'קשורים' : 'linked'}
                  </span>
                )}
                {topic.last_seen_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock className="w-3 h-3" />{new Date(topic.last_seen_date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#F1EEE6', overflow: 'hidden' }}>
                  <div className="tc-bar-fill" style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: pri.grad }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: pri.color, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </div>
              {topic.progress_note && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#9A8672' }}>{topic.progress_note}</p>}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => onEditTopic(topic)}
                  style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '9px 0', borderRadius: 10, background: '#0D1A12', color: '#4ADE80', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isHe ? 'עדכן התקדמות' : 'Update progress'}
                </button>
                <button onClick={() => handleStatusChange(topic, 'resolved')}
                  style={{ fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 10, background: '#F6F4EE', color: '#5C6B61', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ {isHe ? 'סגור' : 'Resolve'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <button onClick={onAddTopic}
          style={{ border: '2px dashed rgba(22,163,74,.35)', borderRadius: 16, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 180, color: '#16A34A', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(22,163,74,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>+</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{isHe ? 'נושא עבודה חדש' : 'New work topic'}</span>
          <span style={{ fontSize: 11, color: '#94A39A' }}>{isHe ? 'או צור אוטומטית מסיכום משחק' : 'or auto-create from a match summary'}</span>
        </button>
      </div>

      {/* Resolved topics — collapsed rows */}
      {resolvedList.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {resolvedList.map(topic => (
            <div key={topic.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(13,26,18,.05)', opacity: .8 }}>
              <span style={{ color: '#16A34A', fontSize: 15 }}>✓</span>
              <span style={{ flex: 1, minWidth: 140, fontSize: 13, fontWeight: 600, color: '#14231A', textDecoration: 'line-through', textDecorationColor: 'rgba(20,35,26,.3)' }}>{topic.title}</span>
              <span style={{ fontSize: 10, color: '#94A39A' }}>
                {topic.last_seen_date ? `${isHe ? 'נסגר ב-' : 'closed '}${new Date(topic.last_seen_date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' })} · ` : ''}
                🏆 {topic.progress_note || (isHe ? 'הושלם' : 'completed')}
              </span>
              <button onClick={() => handleStatusChange(topic, 'active')}
                style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, background: 'rgba(217,119,6,.10)', color: '#D97706', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {isHe ? 'פתח מחדש' : 'Reopen'}
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ marginTop: 14, background: '#fff', borderRadius: 16, padding: '40px 20px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <Target className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p style={{ fontSize: 13, color: '#9A8672' }}>{isHe ? 'אין נושאים להצגה' : 'No topics to display'}</p>
        </div>
      )}
    </div>
  );
}
