import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Swords, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Brain, ArrowRight, ExternalLink, Target, TrendingUp, TrendingDown
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WorkTopicModal from './WorkTopicModal';
import TrendsSection from '../analysis/TrendsSection';

const RESULT_MAP = {
  win:  { label: 'נצ', color: '#2A7050', bg: 'rgba(42,112,80,0.15)' },
  draw: { label: 'ת', color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  loss: { label: 'ה', color: '#B94040', bg: 'rgba(185,64,64,0.12)' },
};

function getResult(s) {
  if (s.result_our == null) return null;
  if (s.result_our > s.result_opponent) return RESULT_MAP.win;
  if (s.result_our === s.result_opponent) return RESULT_MAP.draw;
  return RESULT_MAP.loss;
}

export default function MatchSummariesTab({ summaries, topics, onRefresh, teamId, analyses }) {
  const [expanded, setExpanded] = useState(null);
  const [newTopicFromSummary, setNewTopicFromSummary] = useState(null); // summary to pre-fill from

  const matchSummaries = summaries
    .filter(s => s.event_type === 'match')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  if (matchSummaries.length === 0) {
    return (
      <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
        <CardContent className="py-12 text-center">
          <Swords className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p className="text-sm" style={{ color: '#9A8672' }}>עדיין לא הוכנסו סיכומי משחקים</p>
          <p className="text-xs mt-1" style={{ color: '#C8BFB3' }}>לאחר מילוי סיכום מקצועי למשחק, הוא יופיע כאן</p>
        </CardContent>
      </Card>
    );
  }

  // Check if a topic already exists for this summary's topics
  const findExistingTopic = (summary) => {
    const summaryTopics = summary.tactical_topics || [];
    return topics.find(t =>
      (t.linked_topics || []).some(lt => summaryTopics.includes(lt)) ||
      summaryTopics.some(st => (t.title || '').includes(st) || st.includes(t.title || ''))
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Trends Section */}
      {analyses && analyses.length >= 2 && (
        <div className="mb-4">
          <TrendsSection analyses={analyses} />
        </div>
      )}

      <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>
        {matchSummaries.length} סיכומי משחקים
      </p>

      {matchSummaries.map(summary => {
        const isOpen = expanded === summary.id;
        const result = getResult(summary);
        const sessionTopics = summary.tactical_topics || [];
        const hasIssues = !!(summary.issues_found || '').trim();
        const existingTopic = findExistingTopic(summary);

        return (
          <Card key={summary.id}
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
            <CardContent className="p-0">
              {/* Header row */}
              <button
                className="w-full text-right p-4 flex items-start gap-3"
                onClick={() => setExpanded(isOpen ? null : summary.id)}
              >
                {/* Date + result */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: '#5C4E38' }}>
                    {summary.event_date
                      ? new Date(summary.event_date).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })
                      : '—'}
                  </span>
                  {result && (
                    <span className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: result.bg, color: result.color }}>
                      {result.label}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Match title */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
                      מול {summary.event_label?.replace('מול ', '') || 'יריב'}
                    </span>
                    {result && summary.result_our != null && (
                      <span className="text-xs font-bold"
                        style={{ color: result.color }}>
                        {summary.result_our}:{summary.result_opponent}
                      </span>
                    )}
                  </div>

                  {/* Topic tags */}
                  {sessionTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {sessionTopics.slice(0, 4).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(41,82,168,0.10)', color: '#2A5FA8', border: '1px solid rgba(41,82,168,0.22)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Issues summary line */}
                  {hasIssues && (
                    <p className="text-[10px] line-clamp-1" style={{ color: '#B94040' }}>
                      <AlertCircle className="w-2.5 h-2.5 inline ml-0.5" />
                      {summary.issues_found}
                    </p>
                  )}
                </div>

                {isOpen
                  ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9A8672' }} />
                  : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9A8672' }} />}
              </button>

              {/* Expanded */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
                  {summary.topic && (
                    <p className="text-xs font-medium italic" style={{ color: '#5C4E38' }}>{summary.topic}</p>
                  )}

                  {summary.what_worked && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: '#2A7050' }}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> מה עבד טוב
                      </p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{summary.what_worked}</p>
                    </div>
                  )}

                  {summary.issues_found && (
                    <div className="rounded-lg p-2.5"
                      style={{ backgroundColor: 'rgba(185,64,64,0.06)', border: '1px solid rgba(185,64,64,0.20)' }}>
                      <p className="text-[10px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: '#B94040' }}>
                        <AlertCircle className="w-2.5 h-2.5" /> בעיות שזוהו
                      </p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{summary.issues_found}</p>
                    </div>
                  )}

                  {summary.tactical_insights && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#7A2A8A' }}>💡 תובנות טקטיות</p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{summary.tactical_insights}</p>
                    </div>
                  )}

                  {summary.decisions_next && (
                    <div>
                      <p className="text-[10px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: '#B97A2A' }}>
                        <ArrowRight className="w-2.5 h-2.5" /> החלטות להמשך
                      </p>
                      <p className="text-xs" style={{ color: '#5C4E38' }}>{summary.decisions_next}</p>
                    </div>
                  )}

                  {summary.satisfaction && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: '#9A8672' }}>שביעות רצון:</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <span key={i} className="text-sm">{i <= summary.satisfaction ? '⭐' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA — link to training center */}
                  <div className="pt-1 flex flex-wrap gap-2">
                    {existingTopic ? (
                      <div className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
                        style={{ backgroundColor: 'rgba(42,112,80,0.10)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.25)' }}>
                        <Target className="w-3 h-3" />
                        נושא קשור: <strong>{existingTopic.title}</strong>
                      </div>
                    ) : hasIssues ? (
                      <Button size="sm"
                        onClick={() => setNewTopicFromSummary(summary)}
                        className="h-7 px-2.5 text-xs gap-1"
                        style={{ backgroundColor: 'rgba(185,64,64,0.10)', color: '#B94040', border: '1px solid rgba(185,64,64,0.28)' }}>
                        <TrendingUp className="w-3 h-3" /> פתח נושא עבודה
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Modal to create work topic from summary */}
      {newTopicFromSummary && (
        <WorkTopicModal
          open={true}
          topic={{
            title: newTopicFromSummary.event_label || '',
            description: newTopicFromSummary.issues_found || '',
            source: 'match',
            linked_topics: newTopicFromSummary.tactical_topics || [],
            priority: 'high',
          }}
          teamId={teamId}
          summaries={[newTopicFromSummary]}
          onClose={() => setNewTopicFromSummary(null)}
          onSaved={() => { setNewTopicFromSummary(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}