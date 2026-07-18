import React, { useState } from 'react';
import { Dumbbell, Clock, ChevronDown, ChevronUp, Star } from 'lucide-react';
import TrainingEvaluationModal from './TrainingEvaluationModal';

const TOPIC_COLORS = {
  'לחץ גבוה':        '#B94040',
  'בנייה מהגנה':     '#2A7050',
  'מעברים התקפיים': '#2A5FA8',
  'מעברים הגנתיים': '#7A2A8A',
  'תיאום הגנתי':    '#B97A2A',
  'מצבים נייחים':   '#5A8A2A',
  'שליטה במרכז':    '#2A7A8A',
};
const defaultColor = '#9A8672';
const CARD_SHADOW = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

// Insight blocks share one colored-box style (README §5).
function InsightBlock({ title, titleColor, bg, children }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: titleColor }}>{title}</div>
      <div style={{ fontSize: 11, color: '#14231A', marginTop: 2 }}>{children}</div>
    </div>
  );
}

const PERIODS = [
  { id: 'month', label: 'החודש', days: 31 },
  { id: 'quarter', label: '3 חודשים', days: 92 },
  { id: 'season', label: 'העונה', days: 3650 },
];

export default function TrainingSessionsList({ summaries, topics, onRefresh, teamId }) {
  const [expanded, setExpanded] = useState(null);
  const [evaluatingEvent, setEvaluatingEvent] = useState(null);
  const [period, setPeriod] = useState('season');

  const periodDays = PERIODS.find(p => p.id === period)?.days ?? 3650;
  const cutoff = Date.now() - periodDays * 86400000;
  const list = summaries
    .filter(s => !s.event_date || new Date(s.event_date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const Header = (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 4px' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#14231A' }}>אימונים קבוצתיים</div>
        <div style={{ fontSize: 12, color: '#5C6B61', marginTop: 2 }}>יומן האימונים שתועדו — מה עבד, מה התגלה ומה הוחלט להמשך.</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {PERIODS.map(p => {
          const on = period === p.id;
          return (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              style={{ fontSize: 11, fontWeight: on ? 700 : 600, padding: '6px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: on ? '#0D1A12' : '#fff', color: on ? '#4ADE80' : '#5C6B61', boxShadow: on ? 'none' : '0 1px 2px rgba(13,26,18,.06)' }}>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (list.length === 0) {
    return (
      <div dir="rtl">
        {Header}
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, padding: '48px 20px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <Dumbbell className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p style={{ fontSize: 13, color: '#9A8672' }}>אין אימונים בטווח הנבחר</p>
          <p style={{ fontSize: 11, color: '#C8BFB3', marginTop: 4 }}>לאחר מילוי סיכום מקצועי לאימון, הוא יופיע כאן</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {Header}

      {/* Timeline */}
      <div style={{ marginTop: 16, position: 'relative', paddingInlineStart: 22 }}>
        <div style={{ position: 'absolute', top: 8, bottom: 8, insetInlineStart: 7, width: 2, background: 'linear-gradient(180deg,#4ADE80,rgba(74,222,128,.1))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((session, idx) => {
            const isOpen = expanded === session.id;
            const sessionTopics = session.tactical_topics || [];
            const linkedGoals = topics.filter(t => (t.linked_topics || []).some(lt => sessionTopics.includes(lt)));
            const latest = idx === 0;
            const d = session.event_date ? new Date(session.event_date) : null;

            return (
              <div key={session.id} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', insetInlineStart: -21, top: 18, width: 12, height: 12, borderRadius: 99,
                  background: latest ? '#4ADE80' : '#fff', border: '3px solid #F6F4EE',
                  boxShadow: latest ? '0 0 0 2px rgba(74,222,128,.35)' : '0 0 0 2px rgba(148,163,154,.4)',
                }} />
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(isOpen ? null : session.id)}
                    style={{ width: '100%', textAlign: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 44, textAlign: 'center', background: '#F6F4EE', borderRadius: 10, padding: '6px 0', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#14231A' }}>{d ? d.getDate() : '—'}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94A39A' }}>{d ? d.toLocaleDateString('he-IL', { month: 'short' }) : ''}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#14231A' }}>{session.event_label || session.topic || 'אימון'}</span>
                        {session.duration_minutes && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#94A39A' }}>
                            <Clock className="w-2.5 h-2.5" />{session.duration_minutes} דק'
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                        {sessionTopics.map(t => {
                          const c = TOPIC_COLORS[t] || defaultColor;
                          return <span key={t} style={{ fontSize: 10, padding: '2px 9px', borderRadius: 99, background: `${c}18`, color: c, border: `1px solid ${c}33` }}>{t}</span>;
                        })}
                        {linkedGoals.map(g => (
                          <span key={g.id} style={{ fontSize: 10, padding: '2px 9px', borderRadius: 99, background: 'rgba(74,222,128,.12)', color: '#16A34A', fontWeight: 700 }}>◎ מקדם: {g.title}</span>
                        ))}
                      </div>
                    </div>
                    {session.satisfaction && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12 }}>{'⭐'.repeat(Math.min(5, session.satisfaction))}</span>
                        <span style={{ fontSize: 10, color: '#94A39A' }}>{session.satisfaction}/5</span>
                      </div>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#94A39A' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94A39A' }} />}
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 18px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
                        {session.what_worked && <InsightBlock title="✓ מה עבד" titleColor="#16A34A" bg="#E7F6EC">{session.what_worked}</InsightBlock>}
                        {session.issues_found && <InsightBlock title="⚠ מה התגלה" titleColor="#DC2626" bg="#FCEBEB">{session.issues_found}</InsightBlock>}
                        {session.tactical_insights && <InsightBlock title="💡 תובנות טקטיות" titleColor="#2563EB" bg="#EAF1FD">{session.tactical_insights}</InsightBlock>}
                        {session.decisions_next && <InsightBlock title="→ החלטות להמשך" titleColor="#D97706" bg="#FDF3E3">{session.decisions_next}</InsightBlock>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); setEvaluatingEvent({ id: session.event_id, game_date: session.event_date, label: session.event_label || session.topic }); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 8, background: 'rgba(22,163,74,.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,.25)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Star className="w-3 h-3" />הערכת שחקנים באימון
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {evaluatingEvent && (
        <TrainingEvaluationModal
          open={!!evaluatingEvent}
          onClose={() => setEvaluatingEvent(null)}
          trainingEvent={evaluatingEvent}
          teamId={teamId}
          onSaved={() => { setEvaluatingEvent(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}
