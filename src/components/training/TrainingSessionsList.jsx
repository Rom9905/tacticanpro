import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock, Tag, ChevronDown, ChevronUp, Calendar, AlertCircle, Star } from 'lucide-react';
import TrainingEvaluationModal from './TrainingEvaluationModal';

const TOPIC_COLORS = {
  'לחץ גבוה':         '#B94040',
  'בנייה מהגנה':      '#2A7050',
  'מעברים התקפיים':  '#2A5FA8',
  'מעברים הגנתיים':  '#7A2A8A',
  'תיאום הגנתי':     '#B97A2A',
  'מצבים נייחים':    '#5A8A2A',
  'שליטה במרכז':     '#2A7A8A',
};

const defaultColor = '#9A8672';

export default function TrainingSessionsList({ summaries, topics, onRefresh, teamId }) {
  const [expanded, setExpanded] = useState(null);
  const [evaluatingEvent, setEvaluatingEvent] = useState(null);

  if (summaries.length === 0) {
    return (
      <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
        <CardContent className="py-12 text-center">
          <Dumbbell className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p className="text-sm" style={{ color: '#9A8672' }}>עדיין לא תועדו אימונים קבוצתיים</p>
          <p className="text-xs mt-1" style={{ color: '#C8BFB3' }}>לאחר מילוי סיכום מקצועי לאימון, הוא יופיע כאן</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>
          {summaries.length} אימונים מתועדים
        </p>
      </div>

      {summaries.map(session => {
        const isOpen = expanded === session.id;
        const sessionTopics = session.tactical_topics || [];

        // Find linked work topics in TacticalGoal
        const linkedGoals = topics.filter(t =>
          (t.linked_topics || []).some(lt => sessionTopics.includes(lt))
        );

        return (
          <Card key={session.id}
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
            <CardContent className="p-0">
              {/* Row header — always visible */}
              <button
                className="w-full text-right p-4 flex items-start gap-3"
                onClick={() => setExpanded(isOpen ? null : session.id)}
              >
                {/* Date column */}
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-sm font-bold" style={{ color: '#2C2416' }}>
                    {session.event_date ? new Date(session.event_date).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' }) : '—'}
                  </div>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
                      {session.event_label || session.topic || 'אימון'}
                    </span>
                    {session.duration_minutes && (
                      <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#9A8672' }}>
                        <Clock className="w-2.5 h-2.5" />{session.duration_minutes} דק'
                      </span>
                    )}
                  </div>

                  {/* Tactical topic tags */}
                  {sessionTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sessionTopics.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${TOPIC_COLORS[t] || defaultColor}18`,
                            color: TOPIC_COLORS[t] || defaultColor,
                            border: `1px solid ${TOPIC_COLORS[t] || defaultColor}33`,
                          }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked work topics */}
                  {linkedGoals.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Tag className="w-2.5 h-2.5" style={{ color: '#2A7050' }} />
                      {linkedGoals.map(g => (
                        <span key={g.id} className="text-[10px] font-semibold" style={{ color: '#2A7050' }}>
                          {g.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand chevron */}
                <div className="flex-shrink-0 mt-0.5">
                  {isOpen
                    ? <ChevronUp className="w-4 h-4" style={{ color: '#9A8672' }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: '#9A8672' }} />}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
                  {session.what_worked && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#2A7050' }}>✓ מה עבד טוב</p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{session.what_worked}</p>
                    </div>
                  )}
                  {session.issues_found && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: '#B94040' }}>
                        <AlertCircle className="w-2.5 h-2.5" /> בעיות שהתגלו
                      </p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{session.issues_found}</p>
                    </div>
                  )}
                  {session.tactical_insights && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#2A5FA8' }}>💡 תובנות טקטיות</p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{session.tactical_insights}</p>
                    </div>
                  )}
                  {session.decisions_next && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#B97A2A' }}>→ החלטות להמשך</p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{session.decisions_next}</p>
                    </div>
                  )}
                  {session.satisfaction && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: '#9A8672' }}>שביעות רצון:</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <span key={i} className="text-sm">{i <= session.satisfaction ? '⭐' : '☆'}</span>
                        ))}
                      </div>
                      </div>
                      )}

                      {/* Training evaluation button */}
                      <div className="pt-2 flex justify-end">
                      <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEvaluatingEvent({
                          id: session.event_id,
                          game_date: session.event_date,
                          label: session.event_label || session.topic
                        });
                      }}
                      className="gap-1.5"
                      style={{ backgroundColor: 'rgba(42,112,80,0.10)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.28)', height: '28px', fontSize: '11px' }}
                      >
                      <Star className="w-3 h-3" />
                      הערכת שחקנים באימון
                      </Button>
                      </div>
                      </div>
                      )}
                      </CardContent>
                      </Card>
                      );
                      })}

                      {/* Training Evaluation Modal */}
                      {evaluatingEvent && (
                      <TrainingEvaluationModal
                      open={!!evaluatingEvent}
                      onClose={() => setEvaluatingEvent(null)}
                      trainingEvent={evaluatingEvent}
                      teamId={teamId}
                      onSaved={() => {
                      setEvaluatingEvent(null);
                      onRefresh && onRefresh();
                      }}
                      />
                      )}
                      </div>
                      );
                      }