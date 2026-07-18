import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomLine from '@/components/ui/BottomLine';
import {
  AlertCircle, ChevronDown, ChevronUp, Target, BarChart3, Dumbbell, Brain
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { 
    emoji: '🔴', 
    label: 'חומרה גבוהה', 
    color: '#B94040', 
    bg: 'rgba(185,64,64,0.08)', 
    border: 'rgba(185,64,64,0.28)' 
  },
  high: { 
    emoji: '🟡', 
    label: 'חומרה בינונית-גבוהה', 
    color: '#D97706', 
    bg: 'rgba(217,119,6,0.08)', 
    border: 'rgba(217,119,6,0.28)' 
  },
  medium: { 
    emoji: '🟡', 
    label: 'חומרה בינונית', 
    color: '#B97A2A', 
    bg: 'rgba(185,122,42,0.08)', 
    border: 'rgba(185,122,42,0.28)' 
  },
  low: { 
    emoji: '🟢', 
    label: 'חומרה נמוכה', 
    color: '#2A7050', 
    bg: 'rgba(42,112,80,0.08)', 
    border: 'rgba(42,112,80,0.28)' 
  }
};

const SOURCE_CONFIG = {
  match: { icon: BarChart3, label: 'ניתוח משחקים', color: '#2A5FA8' },
  training: { icon: Dumbbell, label: 'ניתוח אימונים', color: '#2A7050' },
  manual: { icon: Brain, label: 'תובנות', color: '#B94040' }
};

function getImpactLevel(occurrenceCount) {
  if (occurrenceCount >= 5) return { level: 'גבוהה מאוד', score: 9, color: '#B94040' };
  if (occurrenceCount >= 3) return { level: 'גבוהה', score: 7, color: '#D97706' };
  if (occurrenceCount >= 2) return { level: 'בינונית', score: 5, color: '#B97A2A' };
  return { level: 'נמוכה', score: 3, color: '#2A7050' };
}

export default function IssueCard({ issue, onGoToTraining, onGoToAnalysis, compact = false, professionalSummaries = [], matchAnalyses = [] }) {
  const [expanded, setExpanded] = useState(false);
  
  const severity = SEVERITY_CONFIG[issue.priority] || SEVERITY_CONFIG.medium;
  const sourceInfo = SOURCE_CONFIG[issue.source] || SOURCE_CONFIG.manual;
  const SourceIcon = sourceInfo.icon;
  const impact = getImpactLevel(issue.occurrence_count || 0);

  if (compact) {
    return (
      <div 
        className="p-3 rounded-xl transition-all hover:shadow-sm"
        style={{ 
          backgroundColor: severity.bg, 
          border: `1.5px solid ${severity.border}` 
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-bold text-sm" style={{ color: '#2C2416' }}>
                {issue.title}
              </h4>
              <Badge 
                className="text-[10px] font-semibold px-2 py-0.5"
                style={{ backgroundColor: `${severity.color}22`, color: severity.color, border: 'none' }}
              >
                {severity.emoji} {severity.label}
              </Badge>
            </div>
            {issue.description && (
              <p className="text-xs leading-relaxed mb-2" style={{ color: '#5C4E38' }}>
                {issue.description}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap text-[10px]" style={{ color: '#9A8672' }}>
              <div className="flex items-center gap-1">
                <SourceIcon className="w-3 h-3" />
                <span>{sourceInfo.label}</span>
              </div>
              {issue.occurrence_count > 0 && (
                <span>זוהתה {issue.occurrence_count}× פעמים</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={onGoToTraining}
            style={{ 
              backgroundColor: severity.color, 
              color: '#fff', 
              fontSize: '11px', 
              height: '28px',
              flexShrink: 0
            }}
            className="gap-1"
          >
            <Target className="w-3 h-3" /> טפל
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl overflow-hidden transition-all"
      style={{ 
        backgroundColor: '#FAF7F2', 
        border: `2px solid ${severity.border}` 
      }}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Bottom Line — AI Insight */}
        <BottomLine
          dataForAI={{
            title: issue.title,
            description: issue.description,
            category: issue.category,
            priority: issue.priority,
            occurrence_count: issue.occurrence_count,
            source: sourceInfo.label,
            last_seen_date: issue.last_seen_date,
            linked_topics: issue.linked_topics,
            progress_pct: issue.progress_pct,
          }}
          context="בעיה טקטית פתוחה בכדורגל"
          cacheKey={`issue-${issue.id || issue.title}`}
          color={severity.color}
        />
        <div className="flex items-start gap-3 mb-3">
          {/* Icon Circle */}
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: severity.bg }}
          >
            <AlertCircle className="w-6 h-6" style={{ color: severity.color }} />
          </div>

          {/* Title & Badges */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base mb-2" style={{ color: '#2C2416' }}>
              {issue.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                className="text-xs font-semibold px-2.5 py-0.5"
                style={{ backgroundColor: `${severity.color}18`, color: severity.color, border: `1px solid ${severity.color}40` }}
              >
                {severity.emoji} {severity.label}
              </Badge>
              {issue.category && (
                <Badge 
                  className="text-xs px-2 py-0.5"
                  style={{ backgroundColor: 'rgba(41,82,168,0.10)', color: '#2A5FA8', border: '1px solid rgba(41,82,168,0.20)' }}
                >
                  {issue.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#5C4E38' }}>
            {issue.description}
          </p>
        )}

        {/* Source & Occurrences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#9A8672' }}>זוהתה ב:</p>
            <div className="flex items-center gap-2">
              <SourceIcon className="w-4 h-4" style={{ color: sourceInfo.color }} />
              <span className="text-sm font-medium" style={{ color: '#2C2416' }}>{sourceInfo.label}</span>
            </div>
            {issue.occurrence_count > 0 && (
              <p className="text-xs mt-1" style={{ color: '#7A6B57' }}>
                {issue.occurrence_count} אירועים זוהו
              </p>
            )}
            {issue.last_seen_date && (
              <p className="text-[10px] mt-1" style={{ color: '#9A8672' }}>
                לאחרונה: {new Date(issue.last_seen_date).toLocaleDateString('he-IL')}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#9A8672' }}>השפעה על המשחק:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-2xl font-bold" style={{ color: impact.color }}>{impact.score}/10</div>
                <div className="text-xs mt-0.5" style={{ color: '#7A6B57' }}>{impact.level}</div>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${impact.color}18`, border: `2px solid ${impact.color}40` }}>
                <span className="text-xl font-bold" style={{ color: impact.color }}>{impact.score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar (if exists) */}
        {issue.progress_pct > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: '#7A6B57' }}>התקדמות בטיפול</span>
              <span className="text-xs font-bold" style={{ color: severity.color }}>{issue.progress_pct}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(139,115,85,0.12)' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${issue.progress_pct}%`, backgroundColor: severity.color }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onGoToTraining}
            className="flex-1 gap-2"
            style={{ 
              backgroundColor: severity.color, 
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <Target className="w-4 h-4" />
            עבור לנושא אימון
          </Button>
          {onGoToAnalysis && (
            <Button
              onClick={onGoToAnalysis}
              variant="outline"
              className="gap-2"
              style={{ 
                borderColor: severity.border,
                color: severity.color,
                fontSize: '13px'
              }}
            >
              <BarChart3 className="w-4 h-4" />
              צפה בניתוח
            </Button>
          )}
        </div>

        {/* Expand/Collapse */}
        {(issue.source_summaries?.length > 0 || issue.linked_topics?.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 pt-3 flex items-center justify-center gap-1 text-xs font-medium transition-colors"
            style={{ 
              borderTop: '1px solid rgba(139,115,85,0.14)',
              color: '#7A6B57'
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                הסתר פירוט
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                הצג פירוט מלא
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
          {issue.source_summaries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#9A8672' }}>
                סיכומים קשורים:
              </p>
              <div className="space-y-1.5">
                {issue.source_summaries.map((summaryId, i) => {
                  // source_summaries mixes ProfessionalSummary ids and
                  // MatchAnalysis ids (tacticalGoalsSync stores analysis.id) —
                  // resolve against both; never show a raw UUID.
                  const summary = professionalSummaries.find(s => s.id === summaryId);
                  const analysis = !summary ? matchAnalyses.find(a => a.id === summaryId) : null;
                  let label;
                  if (summary) {
                    const dateStr = summary.event_date ? new Date(summary.event_date).toLocaleDateString('he-IL') : '';
                    label = summary.event_label
                      ? `${summary.event_label}${dateStr ? ` — ${dateStr}` : ''}`
                      : summary.topic
                        ? `${summary.topic}${dateStr ? ` — ${dateStr}` : ''}`
                        : dateStr || 'סיכום מקצועי';
                  } else if (analysis) {
                    const dateStr = analysis.date ? new Date(analysis.date).toLocaleDateString('he-IL') : '';
                    label = `ניתוח משחק מול ${analysis.opponent || '?'}${dateStr ? ` — ${dateStr}` : ''}`;
                  } else {
                    label = 'סיכום שנמחק מהמערכת';
                  }
                  return (
                    <div 
                      key={i}
                      className="text-xs p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(139,115,85,0.06)', color: '#5C4E38' }}
                    >
                      • {label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {issue.linked_topics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#9A8672' }}>
                נושאים טקטיים קשורים:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {issue.linked_topics.map((topic, i) => (
                  <Badge 
                    key={i}
                    className="text-[10px] px-2 py-0.5"
                    style={{ 
                      backgroundColor: 'rgba(42,112,80,0.10)', 
                      color: '#2A7050',
                      border: '1px solid rgba(42,112,80,0.20)'
                    }}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}