import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2, BookOpen, ChevronDown, ChevronUp, HelpCircle,
  Link2, Sparkles, RefreshCw, AlertCircle, BarChart2
} from 'lucide-react';

export default function DeepAnalysisSection({ analysis, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState({});
  const [error, setError] = useState(null);
  const deep = analysis.deep_analysis;

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      await base44.functions.invoke('generateDeepAnalysis', {
        match_analysis_id: analysis.id
      });
      onRefresh && onRefresh();
    } catch {
      setError('שגיאה ביצירת הניתוח המעמיק. נסה שוב.');
    } finally { setGenerating(false); }
  };

  const toggleIssue = (i) => setExpandedIssues(prev => ({ ...prev, [i]: !prev[i] }));

  // ── Generating state ──
  if (generating) {
    return (
      <div className="p-5 rounded-xl flex flex-col items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-dark-2))', border: '1px solid rgba(74,222,128,0.20)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-green)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--brand-green)' }}>מפיק ניתוח מעמיק...</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>בונה את הסיפור, מרחיב בעיות, מחבר נושאי אימון</span>
      </div>
    );
  }

  // ── No deep analysis yet — dark CTA banner ──
  if (!deep) {
    return (
      <div className="p-5 rounded-xl"
        style={{ background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-dark-2))', border: '1px solid rgba(74,222,128,0.20)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}>
            <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-green)' }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--bg-card)' }}>ניתוח מעמיק</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>הסיפור וההקשר הטקטי מאחורי המסקנות</p>
          </div>
        </div>
        {error && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          קיבלת את המסקנות — עכשיו קבל את הסיפור שמאחוריהן. הניתוח המעמיק מסביר את האיך והלמה: מה קרה במשחק, למה כל בעיה קרתה, ואיך נושאי האימון מתחברים למה שראית.
        </p>
        <button onClick={generate}
          className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-green)', color: 'var(--brand-dark)', boxShadow: '0 2px 8px rgba(74,222,128,0.25)' }}>
          <Sparkles className="w-4 h-4" /> צור ניתוח מעמיק
        </button>
      </div>
    );
  }

  // ── Render deep analysis ──
  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)' }}>{error}</p>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--success-bg)' }}>
            <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>ניתוח מעמיק</h3>
            {deep.data_richness && (
              <span className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5"
                style={{
                  backgroundColor: deep.data_richness === 'sparse' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: deep.data_richness === 'sparse' ? 'var(--warning)' : 'var(--brand-green-dark)'
                }}>
                {deep.data_richness === 'sparse'
                  ? <><HelpCircle className="w-2.5 h-2.5" /> מבוסס הערות מאמן</>
                  : <><BarChart2 className="w-2.5 h-2.5" /> מבוסס נתוני משחק</>}
              </span>
            )}
          </div>
        </div>
        <button onClick={generate} title="חידוש ניתוח"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--success-bg)', color: 'var(--brand-green-dark)' }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Story */}
      {deep.story && (
        <div className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.08)' }}>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--brand-green-dark)' }}>
            <BookOpen className="w-3.5 h-3.5" /> כך התנהל המשחק
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{deep.story}</p>
        </div>
      )}

      {/* Issue Expansions */}
      {deep.issue_expansions?.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <AlertCircle className="w-3.5 h-3.5" /> למה כל בעיה קרתה
          </h4>
          <div className="space-y-2">
            {deep.issue_expansions.map((exp, i) => {
              const isOpen = !!expandedIssues[i];
              return (
                <div key={i} className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(220,38,38,0.15)' }}>
                  <button onClick={() => toggleIssue(i)}
                    className="w-full p-3 flex items-center justify-between text-right transition-colors hover:bg-opacity-80"
                    style={{ backgroundColor: 'var(--danger-bg)' }}>
                    <span className="text-sm font-medium flex items-center gap-2 flex-1" style={{ color: 'var(--danger)' }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{exp.issue && exp.issue.length > 70 ? exp.issue.substring(0, 70) + '...' : exp.issue}</span>
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 flex-shrink-0 mr-2" style={{ color: 'var(--text-muted)' }} />
                      : <ChevronDown className="w-4 h-4 flex-shrink-0 mr-2" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {isOpen && (
                    <div className="p-4 space-y-2.5" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{exp.explanation}</p>
                      {exp.supporting_data && (
                        <div className="text-xs p-2.5 rounded-lg flex items-start gap-2"
                          style={{
                            backgroundColor: exp.supporting_data.includes('אין נתונים')
                              ? 'rgba(13,26,18,0.04)'
                              : 'var(--success-bg)',
                            border: `1px solid ${exp.supporting_data.includes('אין נתונים')
                              ? 'rgba(13,26,18,0.08)'
                              : 'rgba(22,163,74,0.15)'}`,
                            color: exp.supporting_data.includes('אין נתונים') ? 'var(--text-muted)' : 'var(--brand-green-dark)'
                          }}>
                          <BarChart2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span><span className="font-semibold">המספרים: </span>{exp.supporting_data}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clarifying Questions — only when data is sparse */}
      {deep.clarifying_questions?.length > 0 && (
        <div className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.18)' }}>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
            <HelpCircle className="w-3.5 h-3.5" /> שאלות שיעזרו לניתוח הבא
          </h4>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            המידע מהמשחק הזה היה מצומצם. התשובות לשאלות האלה יעזרו לנו להעמיק בפעם הבאה (אפשר לדלג):
          </p>
          <div className="space-y-3">
            {deep.clarifying_questions.map((q, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                    {i + 1}
                  </span>
                  <span className="flex-1">{q.question}</span>
                </p>
                {q.reason && (
                  <p className="text-xs mt-1 mr-7 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{q.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Topic Context */}
      {deep.training_topic_context?.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Link2 className="w-3.5 h-3.5" /> איך נושאי האימון מתחברים למשחק
          </h4>
          <div className="space-y-2">
            {deep.training_topic_context.map((t, i) => (
              <div key={i} className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(22,163,74,0.14)' }}>
                <p className="text-sm font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--brand-green-dark)' }}>
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {t.topic}
                </p>
                <p className="text-xs leading-relaxed mr-5.5" style={{ color: 'var(--text-secondary)' }}>{t.story_link}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}